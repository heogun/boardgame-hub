import { store } from '../state/store';
import { createPeer } from './peer';
import { addPlayer, syncStateToAll, broadcastToClients } from './sync';
import { logSystem } from '../ui/utils/log';
import { updateScreen } from '../ui/utils/dom';
import { showToast } from '../ui/utils/toast';
import type { AnyPayload, CMAnyPayload } from '../types';
import { handleCosmoMessage } from '../games/cosmo/ui';

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

    updateScreen('room');
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
    conn.on('open', () => {
      store.connections[conn.peer] = conn;
      conn.on('data', (data) => handleIncomingDataAsHost(conn.peer, data as AnyPayload));
    });

    conn.on('close', () => {
      logSystem(`클라이언트 통신 끊김: ${conn.peer}`);
      removePlayer(conn.peer);
      const conns = store.connections;
      delete conns[conn.peer];
      store.setConnections(conns);
    });
  });
}

function handleIncomingDataAsHost(peerId: string, payload: AnyPayload) {
  if (!payload || !payload.type) return;

  switch (payload.type) {
    case 'ACTION_JOIN':
      addPlayer(peerId, payload.name as string, false);
      logSystem(`${payload.name as string} 님이 방에 참가했습니다.`);
      break;

    case 'ACTION_CHAT': {
      const p = store.gameState.players.find((pl) => pl.id === peerId);
      const pName = p ? p.name : 'Unknown';
      logSystem(payload.message as string, false, pName);
      broadcastToClients({
        type: 'EVENT_CHAT',
        senderName: pName,
        message: payload.message as string,
      });
      break;
    }

    case 'ACTION_SELECT_GAME':
      if (store.isHost) {
        store.updateGameState({ selectedGame: payload.game as string });
        syncStateToAll();
        logSystem(`게임 모듈이 [${payload.game as string}] (으)로 변경되었습니다.`);
      }
      break;

    default:
      if (payload.type.startsWith('CM_')) {
        handleCosmoMessage(peerId, payload as CMAnyPayload);
      }
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

export function sendActionToHost(actionObj: AnyPayload) {
  if (store.hostConnection && store.hostConnection.open) {
    store.hostConnection.send(actionObj);
  } else if (store.isHost) {
    handleIncomingDataAsHost(store.myId!, actionObj);
  }
}
