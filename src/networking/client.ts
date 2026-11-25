import type { DataConnection } from 'peerjs';
import { store } from '../state/store';
import { createPeer } from './peer';
import { handleIncomingDataAsClient } from './sync';
import { logSystem } from '../ui/utils/log';
import { showToast } from '../ui/utils/toast';
import { setLoading } from '../ui/utils/dom';
import { isGameRunning, refreshGameScreen, resetSession } from '../framework/session';
import { clearHostSave } from './host';
import type { ClientBoundPayload } from '../types';

/**
 * 재접속:
 *  - 방장과의 연결이 끊기면 RETRY_WINDOW_MS 동안 같은 peer id 로 다시 연결을 시도한다.
 *    게임 화면은 그대로 두고, 다시 연결되면 방장이 최신 상태를 보내 준다.
 *  - 새로고침해도 이어서 할 수 있도록 방 ID·내 peer id·토큰을 sessionStorage 에 둔다
 *    (탭마다 따로 저장되고 탭을 닫으면 사라진다).
 *  - 방장(호스트)이 새로고침하면 게임 상태가 사라지므로 재접속할 수 없다.
 */
const REJOIN_KEY = 'boardgame-hub:rejoin';
const RETRY_WINDOW_MS = 60_000;
const RETRY_INTERVAL_MS = 2_000;

interface RejoinInfo {
  roomId: string;
  peerId: string;
  token: string;
  name: string;
}

/** 방장 메시지가 이만큼 없으면 연결이 끊긴 것으로 보고 재접속한다 (방장은 4초마다 PING 을 보낸다) */
const HOST_SILENCE_LIMIT_MS = 20_000;
let lastHostMessage = 0;
let watchdog: number | null = null;

let token: string | null = null;
/** 사용자가 스스로 나가는 중이면 재접속하지 않는다 */
let leaving = false;
let reconnecting = false;

function saveRejoin(info: RejoinInfo) {
  try {
    sessionStorage.setItem(REJOIN_KEY, JSON.stringify(info));
  } catch {
    // 저장소를 못 쓰면 새로고침 재접속만 안 된다
  }
}

function loadRejoin(): RejoinInfo | null {
  try {
    const raw = sessionStorage.getItem(REJOIN_KEY);
    const info = raw ? (JSON.parse(raw) as Partial<RejoinInfo>) : null;
    if (info && typeof info.roomId === 'string' && typeof info.peerId === 'string' && typeof info.token === 'string' && typeof info.name === 'string') {
      return info as RejoinInfo;
    }
  } catch {
    // 손상된 값은 무시
  }
  return null;
}

function clearRejoin() {
  try {
    sessionStorage.removeItem(REJOIN_KEY);
  } catch {
    // 무시
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function joinRoom(hostId: string, rejoin?: RejoinInfo) {
  store.isHost = false;
  leaving = false;
  token = rejoin?.token ?? null;

  try {
    store.myId = rejoin ? await createPeerWithRetry(rejoin.peerId) : await createPeer(false);
    connectToHost(hostId);
  } catch {
    if (rejoin) clearRejoin();
    setLoading(false);
    showToast(rejoin ? '이전 방에 다시 접속하지 못했습니다.' : '방 접속에 실패했습니다.', 'error');
  }
}

/** 예전 id 는 시그널링 서버에서 풀릴 때까지 잠깐 '사용 중'일 수 있어 몇 번 다시 시도한다. */
async function createPeerWithRetry(peerId: string): Promise<string> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      return await createPeer(false, peerId);
    } catch (err) {
      if ((err as { type?: string }).type !== 'unavailable-id' || Date.now() > deadline) throw err;
      await sleep(RETRY_INTERVAL_MS);
    }
  }
}

function connectToHost(hostId: string): DataConnection {
  const conn = store.peer!.connect(hostId, { reliable: true });
  store.hostConnection = conn;

  conn.on('open', () => {
    if (store.hostConnection !== conn) return;
    store.roomId = hostId;

    document.getElementById('role-badge')!.textContent = 'CLIENT';
    document.getElementById('role-badge')!.className =
      'px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase rounded-lg border border-emerald-500/30';
    document.getElementById('display-room-id')!.textContent = store.roomId;

    if (!isGameRunning()) store.currentScreen = 'room';
    setLoading(false);
    logSystem(token ? '방장과 다시 연결되었습니다.' : '방장과 연결되었습니다.');

    conn.send({ type: 'ACTION_JOIN', name: store.myName, ...(token ? { token } : {}) });
    lastHostMessage = Date.now();
    startWatchdog(hostId);
  });

  conn.on('data', (data: unknown) => {
    if (store.hostConnection !== conn) return;
    lastHostMessage = Date.now();
    const payload = data as ClientBoundPayload;
    if (payload?.type === 'PING') {
      conn.send({ type: 'PONG' });
      return;
    }
    if (payload?.type === 'JOIN_ACCEPTED') {
      token = payload.token;
      saveRejoin({ roomId: hostId, peerId: store.myId!, token, name: store.myName });
      if (payload.rejoined) showToast('게임에 다시 접속했습니다.', 'success');
      return;
    }
    if (payload?.type === 'ROOM_CLOSED') {
      showToast('방장이 방을 닫았습니다.', 'info');
      leaveRoom();
      return;
    }
    if (payload?.type === 'JOIN_REJECTED') {
      showToast(payload.reason, 'error');
      clearRejoin();
      leaveRoom();
      return;
    }
    handleIncomingDataAsClient(payload);
  });

  conn.on('close', () => {
    if (store.hostConnection !== conn || leaving) return;
    void reconnect(hostId);
  });

  return conn;
}

function startWatchdog(hostId: string) {
  if (watchdog !== null) window.clearInterval(watchdog);
  watchdog = window.setInterval(() => {
    if (leaving || !store.hostConnection) {
      window.clearInterval(watchdog!);
      watchdog = null;
      return;
    }
    if (!reconnecting && Date.now() - lastHostMessage > HOST_SILENCE_LIMIT_MS) {
      try {
        store.hostConnection.close();
      } catch {
        // 무시
      }
      void reconnect(hostId);
    }
  }, 2_000);
}

async function reconnect(hostId: string) {
  if (reconnecting) return;
  reconnecting = true;
  logSystem('방장과의 연결이 끊어졌습니다. 다시 연결하는 중…');
  showToast('연결이 끊겼습니다. 다시 연결하는 중…', 'error');
  // 게임 화면에 '나' 의 연결 끊김을 표시
  store.setPlayerConnected(store.myId!, false);
  refreshGameScreen();

  const deadline = Date.now() + RETRY_WINDOW_MS;
  while (!leaving && Date.now() < deadline) {
    await sleep(RETRY_INTERVAL_MS);
    if (leaving) break;
    try {
      const peer = store.peer;
      if (!peer || peer.destroyed) {
        await createPeer(false, store.myId!);
      } else if (peer.disconnected) {
        peer.reconnect();
        await sleep(1_000);
      }
      const conn = connectToHost(hostId);
      const opened = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 5_000);
        conn.on('open', () => {
          clearTimeout(timer);
          resolve(true);
        });
        conn.on('error', () => {
          clearTimeout(timer);
          resolve(false);
        });
      });
      if (opened) {
        reconnecting = false;
        return;
      }
    } catch {
      // 다음 시도
    }
  }

  reconnecting = false;
  if (leaving) return;
  showToast('방장에게 다시 연결하지 못했습니다.', 'error');
  clearRejoin();
  leaveRoom();
}

/** 새로고침 직후: 이 탭에서 하던 방이 있으면 다시 들어간다. */
export function rejoinOnLoad() {
  const info = loadRejoin();
  if (!info) return;
  store.myName = info.name;
  const nameInput = document.getElementById('input-nickname') as HTMLInputElement | null;
  if (nameInput) nameInput.value = info.name;
  setLoading(true, '이전 방에 다시 접속하는 중...');
  void joinRoom(info.roomId, info);
}

export function leaveRoom() {
  leaving = true;
  if (store.isHost) {
    for (const conn of Object.values(store.connections)) {
      if (conn.open) conn.send({ type: 'ROOM_CLOSED' });
    }
  }
  // 스스로 나가는 것이면 방장이 재접속을 기다리지 않도록 알린다
  if (store.hostConnection?.open) {
    try {
      store.hostConnection.send({ type: 'ACTION_LEAVE' });
    } catch {
      // 무시
    }
  }
  clearRejoin();
  clearHostSave();
  token = null;
  resetSession();
  const peer = store.peer;
  store.peer = null;
  // ACTION_LEAVE 가 전송될 시간을 조금 준다
  if (peer) setTimeout(() => peer.destroy(), 300);
  store.isHost = false;
  store.setConnections({});
  store.hostConnection = null;
  store.roomId = null;
  store.updateGameState({ status: 'LOBBY', selectedGame: '', gameOptions: {}, players: [] });
  document.getElementById('system-logs')!.innerHTML = '';
  store.currentScreen = 'lobby';
}
