import { store } from '../state/store';
import type { GameActionPayload, GameEndPayload, GameErrorPayload, GameStatePayload } from '../types';
import { getGame, isPlayerCountValid, playerRangeLabel, resolveOptions } from './registry';
import { IllegalAction, type AnyGameDefinition, type GameResult, type PlayerInfo, type RenderContext } from './types';
import { syncStateToAll } from '../networking/sync';
import { logSystem } from '../ui/utils/log';
import { showToast } from '../ui/utils/toast';
import { escapeHtml } from '../ui/utils/escape';

/**
 * 게임 세션 런타임. 어떤 게임이든 같은 흐름으로 돌린다.
 *
 *   클라이언트 UI ─dispatch─▶ GAME_ACTION ─▶ 방장 reduce(검증) ─▶ 참가자별 view ─▶ GAME_STATE ─▶ render
 *
 * 방장은 전체 상태를, 클라이언트는 자기에게 허용된 view 만 갖는다.
 */
interface Session {
  id: string;
  def: AnyGameDefinition;
  players: PlayerInfo[];
  /** 방장: 전체 상태 / 클라이언트: 자기 view */
  state: unknown;
  local: unknown;
  tickTimer: number | null;
}

let session: Session | null = null;

export function isGameRunning(): boolean {
  return session !== null;
}

// ===================================================================
// 저장 · 복원 (방장 새로고침 대비)
// ===================================================================

/** 방장이 저장해 두는 게임 세션. 상태는 JSON 으로 저장되므로 게임 상태는 평범한 객체여야 한다. */
export interface SessionSnapshot {
  id: string;
  gameId: string;
  players: PlayerInfo[];
  state: unknown;
}

let persistHook: (() => void) | null = null;

/** 방장의 게임 상태가 바뀔 때마다 불린다 (자동 저장용). */
export function onHostSessionChange(fn: () => void) {
  persistHook = fn;
}

export function exportSession(): SessionSnapshot | null {
  const s = session;
  if (!s || !store.isHost) return null;
  return { id: s.id, gameId: s.def.id, players: s.players, state: s.state };
}

/** 저장해 둔 세션으로 게임을 이어간다 (방장 전용). */
export function restoreSession(snap: SessionSnapshot): boolean {
  const def = getGame(snap.gameId);
  if (!def || !store.isHost) return false;
  teardown();
  const s: Session = {
    id: snap.id,
    def,
    players: snap.players,
    state: snap.state,
    local: def.createLocal?.() ?? {},
    tickTimer: null,
  };
  session = s;
  if (def.tick) s.tickTimer = window.setInterval(hostTick, def.tick.intervalMs);
  store.currentScreen = 'game';
  publish();
  return true;
}

/** 진행 중인 게임의 참가자인지 (관전자 제외) */
export function isSessionPlayer(id: string): boolean {
  return !!session?.players.some((p) => p.id === id);
}

/** 연결 상태처럼 게임 상태 밖의 정보가 바뀌었을 때 게임 화면을 다시 그린다. */
export function refreshGameScreen() {
  render();
}

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function viewFor(s: Session, viewerId: string): unknown {
  return s.def.view ? s.def.view(s.state, viewerId) : s.state;
}

function sendTo(peerId: string, payload: GameStatePayload | GameEndPayload | GameErrorPayload) {
  const conn = store.connections[peerId];
  if (conn?.open) conn.send(payload);
}

function playerName(s: Session, id: string | null | undefined): string {
  const p = s.players.find((pl) => pl.id === id) ?? store.gameState.players.find((pl) => pl.id === id);
  return escapeHtml(p?.name ?? '?');
}

// ===================================================================
// 방장
// ===================================================================

/** 대기실에서 선택한 게임을 시작한다. 실패하면 사유를 돌려준다. */
export function hostStartGame(): string | null {
  if (!store.isHost) return '방장만 게임을 시작할 수 있습니다.';
  const room = store.gameState;
  const def = getGame(room.selectedGame);
  if (!def) return '게임을 선택해주세요.';
  if (!isPlayerCountValid(def, room.players.length)) {
    return `${def.name}은(는) ${playerRangeLabel(def)} 게임입니다. (현재 ${room.players.length}명)`;
  }

  const players: PlayerInfo[] = room.players.map((p) => ({ id: p.id, name: p.name }));
  let state: unknown;
  try {
    state = def.setup({ players, options: resolveOptions(def, room.gameOptions) });
  } catch (err) {
    console.error(`[${def.id}] setup 실패`, err);
    return '게임을 준비하는 중 오류가 발생했습니다.';
  }

  teardown();
  const s: Session = {
    id: newSessionId(),
    def,
    players,
    state,
    local: def.createLocal?.() ?? {},
    tickTimer: null,
  };
  session = s;
  if (def.tick) {
    s.tickTimer = window.setInterval(hostTick, def.tick.intervalMs);
  }

  store.updateGameState({ status: 'PLAYING' });
  syncStateToAll();
  logSystem(`${escapeHtml(def.name)} 게임을 시작합니다!`);
  store.currentScreen = 'game';
  publish();
  return null;
}

/** 모든 클라이언트에 각자의 view 를 보내고 방장 화면도 다시 그린다. */
function publish() {
  const s = session;
  if (!s) return;
  for (const peerId of Object.keys(store.connections)) {
    sendTo(peerId, {
      type: 'GAME_STATE',
      sessionId: s.id,
      gameId: s.def.id,
      players: s.players,
      state: viewFor(s, peerId),
    });
  }
  render();
  persistHook?.();
}

function reject(playerId: string, message: string) {
  if (playerId === store.myId) {
    showToast(message, 'error');
  } else {
    sendTo(playerId, { type: 'GAME_ERROR', message });
  }
}

function hostApplyAction(playerId: string, action: unknown) {
  const s = session;
  if (!s) return;
  if (!s.players.some((p) => p.id === playerId)) {
    reject(playerId, '관전자는 게임에 참여할 수 없습니다.');
    return;
  }
  try {
    s.state = s.def.reduce(structuredClone(s.state), action, {
      playerId,
      players: s.players,
      now: Date.now(),
    });
  } catch (err) {
    if (err instanceof IllegalAction) {
      reject(playerId, err.message);
    } else {
      console.error(`[${s.def.id}] reduce 실패`, action, err);
      reject(playerId, '액션을 처리하는 중 오류가 발생했습니다.');
    }
    return;
  }
  publish();
}

function hostTick() {
  const s = session;
  if (!s?.def.tick) return;
  try {
    const before = JSON.stringify(s.state);
    const next = s.def.tick.update(structuredClone(s.state), { players: s.players, now: Date.now() });
    if (JSON.stringify(next) !== before) {
      s.state = next;
      publish();
    }
  } catch (err) {
    console.error(`[${s.def.id}] tick 실패`, err);
  }
}

export function hostHandleGameAction(peerId: string, payload: GameActionPayload) {
  if (!session || payload.sessionId !== session.id) return;
  hostApplyAction(peerId, payload.action);
}

/** 게임을 끝내고 모두 대기실로 돌아간다. */
export function hostEndGame(reason: string) {
  const s = session;
  if (!s || !store.isHost) return;
  for (const peerId of Object.keys(store.connections)) {
    sendTo(peerId, { type: 'GAME_END', sessionId: s.id, reason });
  }
  teardown();
  store.updateGameState({ status: 'LOBBY' });
  syncStateToAll();
  store.currentScreen = 'room';
  logSystem(escapeHtml(reason));
  persistHook?.();
}

/** 게임 도중 입장한 사람에게는 관전자 view 를 보낸다. */
export function hostOnPeerJoined(peerId: string) {
  const s = session;
  if (!s) return;
  sendTo(peerId, {
    type: 'GAME_STATE',
    sessionId: s.id,
    gameId: s.def.id,
    players: s.players,
    state: viewFor(s, peerId),
  });
}

export function hostOnPeerLeft(peerId: string) {
  const s = session;
  if (!s) return;
  const leaver = s.players.find((p) => p.id === peerId);
  if (!leaver) return; // 관전자

  let next: unknown = null;
  try {
    next = s.def.onPlayerLeave?.(structuredClone(s.state), peerId, { players: s.players, now: Date.now() }) ?? null;
  } catch (err) {
    console.error(`[${s.def.id}] onPlayerLeave 실패`, err);
  }
  if (next === null) {
    hostEndGame(`${leaver.name} 님이 나가서 게임이 종료되었습니다.`);
    return;
  }
  s.state = next;
  publish();
}

// ===================================================================
// 클라이언트
// ===================================================================

export function clientOnGameState(payload: GameStatePayload) {
  if (!session || session.id !== payload.sessionId) {
    const def = getGame(payload.gameId);
    if (!def) {
      showToast(`이 버전에 없는 게임입니다: ${payload.gameId}`, 'error');
      return;
    }
    teardown();
    session = {
      id: payload.sessionId,
      def,
      players: payload.players,
      state: payload.state,
      local: def.createLocal?.() ?? {},
      tickTimer: null,
    };
  } else {
    session.state = payload.state;
    session.players = payload.players;
  }
  store.currentScreen = 'game';
  render();
}

export function clientOnGameEnd(payload: GameEndPayload) {
  if (!session || session.id !== payload.sessionId) return;
  teardown();
  store.currentScreen = 'room';
  logSystem(escapeHtml(payload.reason));
}

export function clientOnGameError(payload: GameErrorPayload) {
  showToast(payload.message, 'error');
}

// ===================================================================
// 공통
// ===================================================================

export function dispatch(action: unknown) {
  const s = session;
  if (!s) return;
  if (store.isHost) {
    hostApplyAction(store.myId!, action);
  } else if (store.hostConnection?.open) {
    const payload: GameActionPayload = { type: 'GAME_ACTION', sessionId: s.id, action };
    store.hostConnection.send(payload);
  } else {
    showToast('방장과 연결되어 있지 않습니다.', 'error');
  }
}

/** 방을 나가거나 연결이 끊겼을 때 호출. */
export function resetSession() {
  teardown();
}

function teardown() {
  if (session?.tickTimer) window.clearInterval(session.tickTimer);
  session = null;
  const content = document.getElementById('game-content');
  if (content) content.innerHTML = '';
  const header = document.getElementById('game-header');
  if (header) header.innerHTML = '';
}

function render() {
  const s = session;
  if (!s) return;
  const content = document.getElementById('game-content');
  const header = document.getElementById('game-header');
  if (!content || !header) return;

  const myId = store.myId ?? '';
  const state = store.isHost ? viewFor(s, myId) : s.state;
  const isSpectator = !s.players.some((p) => p.id === myId);

  let result: GameResult | null = null;
  try {
    result = s.def.result?.(state, s.players) ?? null;
  } catch (err) {
    console.error(`[${s.def.id}] result 실패`, err);
  }
  renderHeader(header, s, result, isSpectator);

  const ctx: RenderContext<unknown, unknown> = {
    myId,
    isHost: store.isHost,
    isSpectator,
    players: s.players,
    playerName: (id) => playerName(s, id),
    dispatch,
    local: s.local,
    rerender: () => {
      if (session === s) render();
    },
  };

  try {
    s.def.render(content, state, ctx);
  } catch (err) {
    console.error(`[${s.def.id}] render 실패`, err);
    content.innerHTML = `<div class="m-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">화면을 그리는 중 오류가 발생했습니다. 콘솔을 확인해주세요.</div>`;
  }
}

/** 연결이 끊겨 재접속을 기다리는 참가자 표시 */
function offlineBanner(s: Session): string {
  const offline = s.players.filter((p) => store.gameState.players.find((rp) => rp.id === p.id)?.connected === false);
  if (!offline.length) return '';
  const names = offline.map((p) => (p.id === store.myId ? '나' : escapeHtml(p.name))).join(', ');
  return `<div class="basis-full mt-2 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-200 text-sm flex items-center gap-2">
    <i class="ph ph-wifi-slash"></i> ${names} 님의 연결이 끊겼습니다. 재접속을 기다리는 중… <span class="text-xs text-sky-300/70">(1분 안에 돌아오지 않으면 퇴장 처리)</span>
  </div>`;
}

function renderHeader(header: HTMLElement, s: Session, result: GameResult | null, isSpectator: boolean) {
  const canRestart = isPlayerCountValid(s.def, store.gameState.players.length);
  header.innerHTML = `
    <div class="flex items-center gap-3 min-w-0">
      <i class="ph ${escapeHtml(s.def.icon)} text-lg text-indigo-300"></i>
      <span class="text-sm font-bold truncate">${escapeHtml(s.def.name)}</span>
      ${isSpectator ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">관전 중</span>' : ''}
    </div>
    <div class="flex items-center gap-2 shrink-0">
      ${store.isHost
        ? `${result && canRestart ? '<button id="btn-game-restart" class="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"><i class="ph ph-arrow-clockwise"></i> 다시 하기</button>' : ''}
           <button id="btn-game-end" class="text-xs px-3 py-1.5 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"><i class="ph ph-sign-out"></i> 대기실로</button>`
        : '<button id="btn-game-leave-room" class="text-xs px-3 py-1.5 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"><i class="ph ph-sign-out"></i> 방 나가기</button>'}
    </div>
    ${offlineBanner(s)}
    ${result
      ? `<div class="basis-full mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-center justify-between gap-2">
           <span><i class="ph ph-flag-checkered"></i> 게임 종료 · ${escapeHtml(result.summary)}</span>
           ${store.isHost ? '' : '<span class="text-xs text-amber-300/70">방장이 대기실로 돌아가기를 기다리는 중…</span>'}
         </div>`
      : ''}
  `;

  header.querySelector('#btn-game-end')?.addEventListener('click', () => {
    if (!result && !window.confirm('진행 중인 게임을 끝내고 모두 대기실로 돌아갈까요?')) return;
    hostEndGame('방장이 게임을 종료했습니다. 대기실로 돌아갑니다.');
  });
  header.querySelector('#btn-game-restart')?.addEventListener('click', () => {
    const err = hostStartGame();
    if (err) showToast(err, 'error');
  });
  header.querySelector('#btn-game-leave-room')?.addEventListener('click', () => {
    if (!window.confirm('방을 나갈까요? 게임에서도 빠지게 됩니다.')) return;
    document.getElementById('btn-leave-room')?.click();
  });
}
