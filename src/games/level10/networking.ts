import { store } from '../../state/store';
import { broadcastToClients } from '../../networking/sync';
import type { L10AnyPayload } from '../../types';
import { handleLevel10Message } from './ui';

export function sendL10ToHost(payload: L10AnyPayload) {
  if (store.hostConnection && store.hostConnection.open) {
    store.hostConnection.send(payload);
  } else if (store.isHost) {
    handleLevel10Message(store.myId!, payload);
  }
}

export function broadcastL10(payload: L10AnyPayload) {
  broadcastToClients(payload);
}

export function syncL10StateToAll() {
  if (store.l10) {
    broadcastL10({
      type: 'L10_STATE_SYNC',
      gs: store.l10,
    });
  }
}
