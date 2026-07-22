import { store } from '../../state/store';
import { broadcastToClients } from '../../networking/sync';
import type { NSAnyPayload } from '../../types';

export function sendNaishiToHost(payload: NSAnyPayload) {
  if (store.hostConnection && store.hostConnection.open) {
    store.hostConnection.send(payload);
  }
}

export function broadcastNaishi(payload: NSAnyPayload) {
  broadcastToClients(payload);
}

export function syncNaishiStateToAll() {
  if (store.naishi) {
    broadcastNaishi({
      type: 'NS_STATE_SYNC',
      gs: store.naishi,
      v: 1,
    });
  }
}

export function createReturnToLobbyMessage(): NSAnyPayload {
  return { type: 'NS_RETURN_TO_LOBBY', v: 1 };
}
