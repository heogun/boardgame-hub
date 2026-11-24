import { store } from '../../state/store';
import { broadcastToClients } from '../../networking/sync';
import type { CMAnyPayload, CosmoCard, CosmoGameState } from '../../types';
import { handleCosmoMessage } from './ui';

// 뒷면 카드 자리표시자 (실제 값 없음)
const HIDDEN_CARD: CosmoCard = { suit: 'A', rank: 0 };

export function sendCosmoToHost(payload: CMAnyPayload) {
  if (store.hostConnection && store.hostConnection.open) {
    store.hostConnection.send(payload);
  } else if (store.isHost) {
    handleCosmoMessage(store.myId!, payload);
  }
}

export function broadcastCosmo(payload: CMAnyPayload) {
  broadcastToClients(payload);
}

/** 수신자가 볼 수 없는 정보(다른 플레이어의 숨긴 카드, 덱 내용)를 가린 상태를 만든다. */
export function maskCosmoStateFor(gs: CosmoGameState, viewerId: string): CosmoGameState {
  if (gs.phase === 'game_over') return gs;

  const players: CosmoGameState['players'] = {};
  for (const [id, p] of Object.entries(gs.players)) {
    if (id === viewerId) {
      players[id] = p;
    } else {
      const hidden = p.hiddenCards.map(() => HIDDEN_CARD);
      players[id] = { ...p, hiddenCards: hidden, hand: [...p.visibleCards, ...hidden] };
    }
  }

  return {
    ...gs,
    players,
    decks: gs.decks.map((deck) => deck.map(() => HIDDEN_CARD)),
  };
}

export function syncCosmoStateToAll() {
  const gs = store.cosmo;
  if (!gs) return;
  Object.entries(store.connections).forEach(([peerId, conn]) => {
    if (conn.open) {
      conn.send({ type: 'CM_STATE_SYNC', gs: maskCosmoStateFor(gs, peerId) } satisfies CMAnyPayload);
    }
  });
}
