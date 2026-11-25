import { store } from '../state/store';
import { createPeer } from './peer';
import { addPlayer, syncStateToAll, broadcastToClients } from './sync';
import { logSystem } from '../ui/utils/log';
import { showToast } from '../ui/utils/toast';
import type { ClientBoundPayload, GameState, HostBoundPayload } from '../types';
import type { DataConnection } from 'peerjs';
import {
  exportSession,
  hostHandleGameAction,
  hostOnPeerJoined,
  hostOnPeerLeft,
  isSessionPlayer,
  onHostSessionChange,
  refreshGameScreen,
  restoreSession,
  type SessionSnapshot,
} from '../framework/session';
import { setLoading } from '../ui/utils/dom';
import { escapeHtml } from '../ui/utils/escape';

/**
 * 재접속:
 *  - 처음 입장한 플레이어에게 비밀 토큰을 준다. 같은 peer id 로 다시 들어올 때 토큰이 맞아야 자리를 돌려준다.
 *  - 게임 중인 플레이어의 연결이 끊기면 바로 내보내지 않고 RECONNECT_GRACE_MS 동안 자리를 남겨 둔다.
 *    그 안에 돌아오면 이어서 하고, 안 돌아오면 예전처럼 퇴장 처리(게임의 onPlayerLeave 또는 종료)한다.
 *  - 대기실에서 끊긴 사람, 스스로 나간 사람(ACTION_LEAVE)은 바로 퇴장 처리한다.
 */
export const RECONNECT_GRACE_MS = 60_000;
const tokens = new Map<string, string>();
const graceTimers = new Map<string, number>();

/**
 * 하트비트: 탭을 그냥 닫으면 WebRTC 의 close 이벤트가 오지 않거나 아주 늦게 온다.
 * 방장이 HEARTBEAT_MS 마다 PING 을 보내고, 클라이언트는 메시지 핸들러에서 바로 PONG 으로 답한다
 * (그래서 클라이언트 탭이 백그라운드여도 답한다). SILENCE_LIMIT_MS 동안 아무 메시지도 없으면 끊긴 것으로 본다.
 */
export const HEARTBEAT_MS = 4_000;
export const SILENCE_LIMIT_MS = 20_000;
const lastSeen = new Map<string, number>();
let heartbeatTimer: number | null = null;

function startHeartbeat() {
  if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
  heartbeatTimer = window.setInterval(() => {
    if (!store.isHost) {
      window.clearInterval(heartbeatTimer!);
      heartbeatTimer = null;
      return;
    }
    const now = Date.now();
    for (const conn of Object.values(store.connections)) {
      if (now - (lastSeen.get(conn.peer) ?? now) > SILENCE_LIMIT_MS) {
        dropConnection(conn);
        continue;
      }
      if (conn.open) conn.send({ type: 'PING' });
    }
  }, HEARTBEAT_MS);
}

/** 연결을 끊긴 것으로 처리한다. close 이벤트가 오든 안 오든 한 번만 처리된다. */
function dropConnection(conn: DataConnection) {
  if (store.connections[conn.peer] !== conn) return;
  const conns = store.connections;
  delete conns[conn.peer];
  store.setConnections(conns);
  lastSeen.delete(conn.peer);
  try {
    conn.close();
  } catch {
    // 이미 닫힘
  }
  onPeerDisconnected(conn.peer);
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sendTo(conn: DataConnection, payload: ClientBoundPayload) {
  if (conn.open) conn.send(payload);
}

function resetHostRuntime() {
  store.isHost = true;
  tokens.clear();
  lastSeen.clear();
  for (const t of graceTimers.values()) window.clearTimeout(t);
  graceTimers.clear();
}

/** 방장 peer 가 열린 뒤 공통 준비 (새 방 / 복원 모두) */
function enterRoomAsHost(id: string) {
  store.myId = id;
  store.roomId = id;
  setupHostPeer();
  startHeartbeat();

  document.getElementById('role-badge')!.textContent = 'HOST';
  document.getElementById('role-badge')!.className =
    'px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase rounded-lg border border-indigo-500/30';
  document.getElementById('display-room-id')!.textContent = id;
}

export async function startHost() {
  resetHostRuntime();
  clearHostSave();
  store.updateGameState({ players: [] });

  try {
    const id = await createPeer(true);
    enterRoomAsHost(id);
    addPlayer(id, store.myName, true);
    store.currentScreen = 'room';
    logSystem('방이 생성되었습니다. 다른 플레이어가 접속하기를 기다립니다.');
    saveHost();
  } catch (err) {
    const peerErr = err as { type?: string; message?: string };
    if (peerErr.type === 'unavailable-id') {
      showToast('방 ID 생성 실패. 다시 시도해주세요.', 'error');
    } else if (peerErr.type === 'network' || peerErr.type === 'server-error') {
      showToast('공용 서버가 불안정합니다. 잠시 후 시도해주세요.', 'error');
    } else {
      showToast('네트워크 에러: ' + (peerErr.message || '알 수 없는 오류'), 'error');
    }
    store.isHost = false;
    throw err;
  }
}

// ===================================================================
// 저장 · 복원
// ===================================================================

/**
 * 방장 탭은 방(참가자·선택한 게임·옵션)과 진행 중인 게임 상태, 재접속 토큰을 sessionStorage 에 계속 저장한다.
 * 방장이 새로고침하면 같은 방 ID 로 다시 열고 게임을 이어간다. 끊겼던 클라이언트는 재접속 시도(60초) 중에
 * 다시 붙어 같은 자리로 돌아온다. 저장은 탭마다 따로이고 탭을 닫으면 사라진다.
 */
const HOST_SAVE_KEY = 'boardgame-hub:host';
/** 이보다 오래된 저장은 복원하지 않는다 */
const HOST_SAVE_MAX_AGE_MS = 10 * 60_000;

interface HostSave {
  v: 1;
  savedAt: number;
  roomId: string;
  name: string;
  room: GameState;
  tokens: [string, string][];
  session: SessionSnapshot | null;
}

let saveQueued = false;
let restoring = false;

/** 같은 틱 안의 여러 변경을 한 번에 저장한다 */
function saveHost() {
  if (saveQueued || restoring) return;
  saveQueued = true;
  queueMicrotask(() => {
    saveQueued = false;
    if (!store.isHost || !store.roomId) return;
    const save: HostSave = {
      v: 1,
      savedAt: Date.now(),
      roomId: store.roomId,
      name: store.myName,
      room: store.gameState,
      tokens: [...tokens.entries()],
      session: exportSession(),
    };
    try {
      sessionStorage.setItem(HOST_SAVE_KEY, JSON.stringify(save));
    } catch (err) {
      // 저장소가 꽉 찼거나 막혀 있으면 저장만 건너뛴다
      console.warn('[host] 저장 실패', err);
    }
  });
}

export function clearHostSave() {
  try {
    sessionStorage.removeItem(HOST_SAVE_KEY);
  } catch {
    // 무시
  }
}

function loadHostSave(): HostSave | null {
  try {
    const raw = sessionStorage.getItem(HOST_SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as HostSave;
    if (save?.v !== 1 || typeof save.roomId !== 'string' || !save.room || Date.now() - save.savedAt > HOST_SAVE_MAX_AGE_MS) {
      clearHostSave();
      return null;
    }
    return save;
  } catch {
    clearHostSave();
    return null;
  }
}

// 게임 상태가 바뀌면(publish) 저장, 방 상태가 바뀌면(store 알림) 저장
onHostSessionChange(saveHost);
store.subscribe(() => {
  if (store.isHost) saveHost();
});

/** 새로고침 직후: 이 탭에서 열었던 방이 있으면 다시 연다. 복원을 시작했으면 true. */
export function restoreHostOnLoad(): boolean {
  const save = loadHostSave();
  if (!save) return false;
  void restoreHost(save);
  return true;
}

async function restoreHost(save: HostSave) {
  setLoading(true, '방을 다시 여는 중...');
  restoring = true;
  resetHostRuntime();
  store.myName = save.name;
  try {
    // 예전 방 ID 는 시그널링 서버에서 풀릴 때까지 잠깐 '사용 중'일 수 있다
    const deadline = Date.now() + 30_000;
    let id: string;
    for (;;) {
      try {
        id = await createPeer(true, save.roomId);
        break;
      } catch (err) {
        if ((err as { type?: string }).type !== 'unavailable-id' || Date.now() > deadline) throw err;
        await new Promise((r) => setTimeout(r, 2_000));
      }
    }
    enterRoomAsHost(id);
    for (const [peerId, t] of save.tokens) tokens.set(peerId, t);

    const others = save.room.players.filter((p) => !p.isHost);
    if (save.session) {
      // 게임 참가자는 자리를 남겨 두고 재접속을 기다린다
      store.setGameState({ ...save.room, players: save.room.players.map((p) => (p.isHost ? p : { ...p, connected: false })) });
      restoring = false;
      if (!restoreSession(save.session)) throw new Error('게임을 복원하지 못했습니다');
      for (const p of others) {
        if (isSessionPlayer(p.id)) onPeerDisconnected(p.id);
        else store.removePlayer(p.id);
      }
    } else {
      // 대기실이었다면 다른 사람은 재접속하면서 다시 들어온다
      store.setGameState({ ...save.room, status: 'LOBBY', players: save.room.players.filter((p) => p.isHost) });
      restoring = false;
      store.currentScreen = 'room';
    }
    syncStateToAll();
    saveHost();
    setLoading(false);
    logSystem('방을 다시 열었습니다. 다른 플레이어가 다시 접속하기를 기다립니다.');
    showToast(save.session ? '진행 중이던 게임을 이어갑니다.' : '방을 다시 열었습니다.', 'success');
  } catch (err) {
    console.error('[host] 복원 실패', err);
    restoring = false;
    clearHostSave();
    store.isHost = false;
    store.peer?.destroy();
    store.peer = null;
    store.updateGameState({ status: 'LOBBY', selectedGame: '', gameOptions: {}, players: [] });
    store.currentScreen = 'lobby';
    setLoading(false);
    showToast('이전 방을 다시 열지 못했습니다.', 'error');
  }
}

function setupHostPeer() {
  store.peer?.on('connection', (conn) => {
    // data 리스너는 연결당 한 번만 등록한다. ('open' 안에서 등록하면 open 이 두 번 오는 경우 메시지가 중복 처리된다)
    conn.on('data', (data) => {
      if (store.connections[conn.peer] === conn) lastSeen.set(conn.peer, Date.now());
      handleIncomingDataAsHost(conn, data as HostBoundPayload);
    });
    conn.on('open', () => {
      // 같은 id 로 다시 연결되면(재접속) 예전 연결을 새 연결로 바꾼다
      const old = store.connections[conn.peer];
      store.connections[conn.peer] = conn;
      lastSeen.set(conn.peer, Date.now());
      if (old && old !== conn) old.close();
    });

    // 이미 새 연결로 바뀐 예전 연결이 닫힌 것이면 dropConnection 이 무시한다
    conn.on('close', () => dropConnection(conn));
  });
}

function onPeerDisconnected(peerId: string) {
  const player = store.gameState.players.find((p) => p.id === peerId);
  if (!player) return;
  if (!isSessionPlayer(peerId)) {
    finalizeLeave(peerId);
    return;
  }
  logSystem(`${escapeHtml(player.name)} 님의 연결이 끊겼습니다. ${RECONNECT_GRACE_MS / 1000}초 동안 재접속을 기다립니다.`);
  store.setPlayerConnected(peerId, false);
  syncStateToAll();
  refreshGameScreen();
  window.clearTimeout(graceTimers.get(peerId));
  graceTimers.set(
    peerId,
    window.setTimeout(() => {
      graceTimers.delete(peerId);
      logSystem(`${escapeHtml(player.name)} 님이 돌아오지 않았습니다.`);
      finalizeLeave(peerId);
    }, RECONNECT_GRACE_MS),
  );
}

/** 자리를 비우고 게임에 퇴장을 알린다. */
function finalizeLeave(peerId: string) {
  window.clearTimeout(graceTimers.get(peerId));
  graceTimers.delete(peerId);
  const player = store.gameState.players.find((p) => p.id === peerId);
  if (player) logSystem(`${escapeHtml(player.name)} 님이 방을 나갔습니다.`);
  removePlayer(peerId);
  hostOnPeerLeft(peerId);
}

function handleJoin(conn: DataConnection, rawName: unknown, token: unknown) {
  const peerId = conn.peer;
  const known = tokens.get(peerId);
  if (known && token !== known) {
    // 다른 사람의 id 로 들어오려는 시도
    sendTo(conn, { type: 'JOIN_REJECTED', reason: '이 자리에 다시 들어올 권한이 없습니다.' });
    setTimeout(() => conn.close(), 500);
    return;
  }

  const existing = store.gameState.players.find((p) => p.id === peerId);
  if (existing) {
    // 끊겼던 자리로 돌아왔다
    window.clearTimeout(graceTimers.get(peerId));
    graceTimers.delete(peerId);
    store.setPlayerConnected(peerId, true);
    syncStateToAll();
    sendTo(conn, { type: 'JOIN_ACCEPTED', token: known!, rejoined: true });
    logSystem(`${escapeHtml(existing.name)} 님이 다시 접속했습니다.`);
    hostOnPeerJoined(peerId);
    refreshGameScreen();
    return;
  }

  const name = String(rawName ?? '').trim().slice(0, MAX_NAME_LENGTH) || '이름없음';
  const t = known ?? newToken();
  tokens.set(peerId, t);
  addPlayer(peerId, name, false);
  saveHost();
  sendTo(conn, { type: 'JOIN_ACCEPTED', token: t, rejoined: false });
  logSystem(`${escapeHtml(name)} 님이 방에 참가했습니다.`);
  hostOnPeerJoined(peerId);
}

const MAX_NAME_LENGTH = 20;
const MAX_CHAT_LENGTH = 300;

function handleIncomingDataAsHost(conn: DataConnection | null, payload: HostBoundPayload) {
  if (!payload || typeof payload.type !== 'string') return;
  const peerId = conn ? conn.peer : store.myId!;

  switch (payload.type) {
    case 'ACTION_JOIN':
      if (conn) handleJoin(conn, payload.name, payload.token);
      break;

    case 'PONG':
      break;

    case 'ACTION_LEAVE':
      if (conn) finalizeLeave(peerId);
      break;

    case 'ACTION_CHAT': {
      const p = store.gameState.players.find((pl) => pl.id === peerId);
      if (!p) return;
      const message = String(payload.message ?? '').slice(0, MAX_CHAT_LENGTH);
      logSystem(message, false, p.name);
      broadcastToClients({ type: 'EVENT_CHAT', senderName: p.name, message });
      break;
    }

    case 'GAME_ACTION':
      hostHandleGameAction(peerId, payload);
      break;
  }
}

function removePlayer(id: string) {
  const idx = store.gameState.players.findIndex((p) => p.id === id);
  if (idx > -1) {
    store.removePlayer(id);
    syncStateToAll();
  }
}

export function sendActionToHost(actionObj: HostBoundPayload) {
  if (store.hostConnection && store.hostConnection.open) {
    store.hostConnection.send(actionObj);
  } else if (store.isHost) {
    handleIncomingDataAsHost(null, actionObj);
  }
}
