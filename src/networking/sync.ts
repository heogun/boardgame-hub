import { store } from '../state/store';
import type { AnyPayload } from '../types';
import { renderPlayerList } from '../ui/components/PlayerList';
import { updateClientSelectionStyle } from '../ui/components/GameModuleCard';
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

export function handleIncomingDataAsClient(payload: AnyPayload) {
  if (!payload || !payload.type) return;

  switch (payload.type) {
    case 'STATE_SYNC':
      store.setGameState(payload.state);
      renderPlayerList();
      updateClientSelectionStyle(store.gameState.selectedGame);
      break;

    case 'EVENT_CHAT':
      logSystem(payload.message as string, false, payload.senderName as string);
      break;

    case 'CM_STATE_SYNC':
      store.cosmo = payload.gs;
      if (store.currentScreen !== 'game-cosmo') {
        store.currentScreen = 'game-cosmo';
      }
      break;

    case 'CM_RETURN_TO_LOBBY':
      store.currentScreen = 'room';
      store.cosmo = null;
      logSystem('방장이 게임을 종료했습니다. 대기실로 돌아갑니다.');
      break;
  }
}
