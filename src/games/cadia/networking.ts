import { store } from '../../state/store';
import { broadcastToClients } from '../../networking/sync';
import type { CDAnyPayload } from '../../types';

export function sendCadiaToHost(payload: CDAnyPayload) {
  if (store.hostConnection && store.hostConnection.open) {
    store.hostConnection.send(payload);
  }
}

export function broadcastCadia(payload: CDAnyPayload) {
  broadcastToClients(payload);
}

export function syncCadiaStateToAll() {
  if (store.cadia) {
    broadcastCadia({
      type: 'CD_STATE_SYNC',
      gs: store.cadia,
      v: 1,
    });
  }
}

export function createReturnToLobbyMessage(): CDAnyPayload {
  return { type: 'CD_RETURN_TO_LOBBY', v: 1 };
}
