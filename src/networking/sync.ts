import { store } from '../state/store';
import type { AnyPayload, ClientBoundPayload } from '../types';
import { clientOnGameEnd, clientOnGameError, clientOnGameState, isGameRunning, refreshGameScreen, resetSession } from '../framework/session';
import { renderPlayerList } from '../ui/components/PlayerList';
import { logSystem } from '../ui/utils/log';

export function addPlayer(id: string, name: string, isHost: boolean) {
  store.addPlayer({ id, name, isHost });
  syncStateToAll();
}

export function removePlayer(id: string) {
  const idx = store.gameState.players.findIndex((p) => p.id === id);
  if (idx > -1) {
    store.removePlayer(id);
    syncStateToAll();
  }
}

export function syncStateToAll() {
  renderPlayerList();
  broadcastToClients({
    type: 'STATE_SYNC',
    state: store.gameState,
  });
}

export function broadcastToClients(dataObj: AnyPayload) {
  Object.values(store.connections).forEach((conn) => {
    if (conn.open) {
      conn.send(dataObj);
    }
  });
}

export function handleIncomingDataAsClient(payload: ClientBoundPayload) {
  if (!payload || typeof payload.type !== 'string') return;

  switch (payload.type) {
    case 'STATE_SYNC':
      store.setGameState(payload.state);
      renderPlayerList();
      if (isGameRunning()) {
        if (payload.state.status === 'LOBBY') {
          // 연결이 끊긴 사이에 게임이 끝났으면 대기실로
          resetSession();
          store.currentScreen = 'room';
        } else {
          refreshGameScreen(); // 다른 플레이어의 연결 상태 표시
        }
      }
      break;

    case 'EVENT_CHAT':
      logSystem(payload.message, false, payload.senderName);
      break;

    case 'GAME_STATE':
      clientOnGameState(payload);
      break;

    case 'GAME_END':
      clientOnGameEnd(payload);
      break;

    case 'GAME_ERROR':
      clientOnGameError(payload);
      break;
  }
}
