import Peer from 'peerjs';
import { store } from '../state/store';

export function createPeer(isHost: boolean): Promise<string> {
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
        peer = new Peer(`ROOM-${randomId}`, options);
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
