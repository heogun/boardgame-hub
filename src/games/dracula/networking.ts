import { store } from '../../state/store';
import { broadcastToClients } from '../../networking/sync';
import type { DVHAnyPayload } from '../../types';
import { handleDraculaMessage } from './ui';

export function sendDraculaToHost(payload: DVHAnyPayload) {
  if (store.hostConnection && store.hostConnection.open) {
    store.hostConnection.send(payload);
  } else if (store.isHost) {
    handleDraculaMessage(store.myId!, payload);
  }
}

export function broadcastDracula(payload: DVHAnyPayload) {
  broadcastToClients(payload);
}

export function syncDraculaStateToAll() {
  if (store.dracula) {
    broadcastDracula({
      type: 'DVH_STATE_SYNC',
      gs: store.dracula,
    });
  }
}
