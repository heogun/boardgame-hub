import { store } from '../../state/store';
import { broadcastToClients } from '../../networking/sync';
import type { BCAnyPayload } from '../../types';
import { handleBuffaloMessage } from './ui';

export function sendBuffaloToHost(payload: BCAnyPayload) {
  if (store.hostConnection && store.hostConnection.open) {
    store.hostConnection.send(payload);
  } else if (store.isHost) {
    handleBuffaloMessage(store.myId!, payload);
  }
}

export function broadcastBuffalo(payload: BCAnyPayload) {
  broadcastToClients(payload);
}

export function syncBuffaloStateToAll() {
  if (store.buffalo) {
    broadcastBuffalo({
      type: 'BC_STATE_SYNC',
      gs: store.buffalo,
    });
  }
}
