import { store } from '../state/store';
import { createPeer } from './peer';
import { handleIncomingDataAsClient } from './sync';
import { logSystem } from '../ui/utils/log';
import { updateScreen } from '../ui/utils/dom';
import { showToast } from '../ui/utils/toast';

export async function joinRoom(hostId: string) {
  store.isHost = false;

  try {
    await createPeer(false);
    const conn = store.peer!.connect(hostId, { reliable: true });
    store.hostConnection = conn;

    conn.on('open', () => {
      store.roomId = hostId;

      document.getElementById('role-badge')!.textContent = 'CLIENT';
      document.getElementById('role-badge')!.className =
        'px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase rounded-lg border border-emerald-500/30';
      document.getElementById('display-room-id')!.textContent = store.roomId;

      updateScreen('room');
      logSystem('방장과 연결되었습니다.');

      conn.send({ type: 'ACTION_JOIN', name: store.myName });
    });

    conn.on('data', (data: unknown) => handleIncomingDataAsClient(data as import('../types').AnyPayload));

    conn.on('close', () => {
      logSystem('방장과의 연결이 끊어졌습니다.');
      showToast('방장과의 연결이 끊어졌습니다.', 'error');
      setTimeout(() => {
        leaveRoom();
      }, 3000);
    });
  } catch {
    showToast('방 접속에 실패했습니다.', 'error');
  }
}

export function leaveRoom() {
  if (store.peer) {
    store.peer.destroy();
    store.peer = null;
  }
  store.isHost = false;
  store.setConnections({});
  store.hostConnection = null;
  store.roomId = null;
  document.getElementById('system-logs')!.innerHTML = '';
  updateScreen('lobby');
}
