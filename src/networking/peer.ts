import Peer from 'peerjs';
import { store } from '../state/store';

/** fixedId 를 주면 그 id 로 접속한다 (재접속 시 예전 id 를 그대로 쓰기 위해). */
export function createPeer(isHost: boolean, fixedId?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    };

    let opened = false;
    const timeout = setTimeout(() => {
      if (!opened) {
        store.peer?.destroy();
        store.peer = null;
        reject(new Error('Connection timeout'));
      }
    }, 10000);

    try {
      let peer: Peer;
      if (isHost) {
        const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        peer = new Peer(fixedId ?? `ROOM-${randomId}`, options);
      } else if (fixedId) {
        peer = new Peer(fixedId, options);
      } else {
        peer = new Peer(options);
      }

      store.peer = peer;

      peer.on('open', (id) => {
        opened = true;
        clearTimeout(timeout);
        resolve(id);
      });

      peer.on('error', (err) => {
        opened = true;
        clearTimeout(timeout);
        store.peer?.destroy();
        store.peer = null;
        reject(err);
      });
    } catch (e) {
      clearTimeout(timeout);
      reject(e);
    }
  });
}

export function destroyPeer() {
  if (store.peer) {
    store.peer.destroy();
    store.peer = null;
  }
}
