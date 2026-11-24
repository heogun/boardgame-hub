import { store } from '../state/store';
import { createPeer } from './peer';
import { addPlayer, syncStateToAll, broadcastToClients } from './sync';
import { logSystem } from '../ui/utils/log';
import { showToast } from '../ui/utils/toast';
import type { HostBoundPayload } from '../types';
import { hostHandleGameAction, hostOnPeerJoined, hostOnPeerLeft } from '../framework/session';
import { escapeHtml } from '../ui/utils/escape';

export async function startHost() {
  store.isHost = true;
  store.updateGameState({ players: [] });

  try {
    const id = await createPeer(true);
    store.myId = id;
    store.roomId = id;

    addPlayer(id, store.myName, true);
    setupHostPeer();

    document.getElementById('role-badge')!.textContent = 'HOST';
    document.getElementById('role-badge')!.className =
      'px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase rounded-lg border border-indigo-500/30';
    document.getElementById('display-room-id')!.textContent = store.roomId;

    store.currentScreen = 'room';
    logSystem('방이 생성되었습니다. 다른 플레이어가 접속하기를 기다립니다.');
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

function setupHostPeer() {
  store.peer?.on('connection', (conn) => {
    // data 리스너는 연결당 한 번만 등록한다. ('open' 안에서 등록하면 open 이 두 번 오는 경우 메시지가 중복 처리된다)
    conn.on('data', (data) => handleIncomingDataAsHost(conn.peer, data as HostBoundPayload));
    conn.on('open', () => {
      store.connections[conn.peer] = conn;
    });

    conn.on('close', () => {
      logSystem(`클라이언트 통신 끊김: ${escapeHtml(conn.peer)}`);
      removePlayer(conn.peer);
      hostOnPeerLeft(conn.peer);
      const conns = store.connections;
      delete conns[conn.peer];
      store.setConnections(conns);
    });
  });
}

const MAX_NAME_LENGTH = 20;
const MAX_CHAT_LENGTH = 300;

function handleIncomingDataAsHost(peerId: string, payload: HostBoundPayload) {
  if (!payload || typeof payload.type !== 'string') return;

  switch (payload.type) {
    case 'ACTION_JOIN': {
      if (store.gameState.players.some((p) => p.id === peerId)) return;
      const name = String(payload.name ?? '').trim().slice(0, MAX_NAME_LENGTH) || '이름없음';
      addPlayer(peerId, name, false);
      logSystem(`${escapeHtml(name)} 님이 방에 참가했습니다.`);
      hostOnPeerJoined(peerId);
      break;
    }

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
    handleIncomingDataAsHost(store.myId!, actionObj);
  }
}
