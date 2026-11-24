import { defineGame, IllegalAction } from '../../framework/types';
import type { DraculaCard, DraculaGameState } from './types';
import {
  canEndRound,
  createInitialGameState,
  discardCard,
  drawCard,
  resolveRound,
  revealCard,
  startNewRound,
  swapTrump,
  swapTwoCards,
  swapWithOpponent,
} from './game';
import { renderDracula, type DraculaAction, type DraculaLocal } from './ui';

const HIDDEN: DraculaCard = { suit: 'red', value: 0 };

function validIndex(i: unknown): i is number {
  return Number.isInteger(i) && (i as number) >= 0 && (i as number) < 5;
}

export default defineGame<DraculaGameState, DraculaAction, DraculaLocal>({
  id: 'dracula',
  name: '드라큘라 vs 반헬싱',
  description: '2인 비대칭 카드 대결',
  icon: 'ph-drop',
  minPlayers: 2,
  maxPlayers: 2,

  // 0번(방장) = 드라큘라, 1번 = 반헬싱
  setup: ({ players }) => createInitialGameState(players[0].id, players[1].id),

  reduce(gs, action, { playerId }) {
    const me = gs.players[playerId];
    if (!me) throw new IllegalAction('참가자가 아닙니다.');

    if (action.type === 'next_round') {
      if (gs.phase !== 'round_end') throw new IllegalAction('라운드가 아직 끝나지 않았습니다.');
      return startNewRound(gs);
    }

    if (gs.phase !== 'playing') throw new IllegalAction('지금은 행동할 수 없습니다.');
    if (me.role !== gs.currentPlayer) throw new IllegalAction('당신의 차례가 아닙니다.');

    switch (action.type) {
      case 'draw':
        if (gs.deck.length === 0) throw new IllegalAction('덱이 비었습니다.');
        return drawCard(gs, playerId);
      case 'discard':
        if (!me.drawnCard) throw new IllegalAction('뽑은 카드가 없습니다.');
        // 버리는 카드는 클라이언트가 보낸 값이 아니라 실제로 뽑은 카드다
        return discardCard(gs, playerId, me.drawnCard, validIndex(action.swapIndex) ? action.swapIndex : undefined);
      case 'swap':
        if (!validIndex(action.index1) || !validIndex(action.index2)) throw new IllegalAction('잘못된 위치입니다.');
        return swapTwoCards(gs, playerId, action.index1, action.index2);
      case 'swap_with_opponent':
        if (!validIndex(action.myIndex)) throw new IllegalAction('잘못된 위치입니다.');
        return swapWithOpponent(gs, playerId, action.myIndex);
      case 'swap_trump':
        if (!gs.colorRanking.includes(action.newTrump)) throw new IllegalAction('잘못된 색입니다.');
        return swapTrump(gs, action.newTrump);
      case 'reveal':
        if (action.target !== 'deck' && !validIndex(action.index)) throw new IllegalAction('잘못된 위치입니다.');
        return revealCard(gs, action.target, playerId, action.index);
      case 'end_round': {
        if (!canEndRound(gs)) throw new IllegalAction('아직 라운드를 끝낼 수 없습니다.');
        const resolved = resolveRound(gs);
        return resolved.phase === 'game_over' ? resolved : { ...resolved, phase: 'round_end' };
      }
    }
    throw new IllegalAction('알 수 없는 액션입니다.');
  },

  // 상대 카드는 공개된 것만, 덱은 장수만 보인다. 게임이 끝나면 모두 공개.
  view(gs, viewerId) {
    if (gs.phase === 'game_over') return gs;
    const players: DraculaGameState['players'] = {};
    for (const [id, p] of Object.entries(gs.players)) {
      if (id === viewerId) {
        players[id] = p;
      } else {
        players[id] = {
          ...p,
          rack: p.rack.map((c, i) => (c && !p.revealedCards.includes(i) ? HIDDEN : c)),
          drawnCard: p.drawnCard ? HIDDEN : undefined,
          revealedDeckCard: undefined,
        };
      }
    }
    return { ...gs, players, deck: gs.deck.map(() => HIDDEN) };
  },

  result(gs) {
    if (gs.phase !== 'game_over') return null;
    return { summary: `${gs.winner === 'dracula' ? '드라큘라' : '반헬싱'} 승리 — ${gs.winnerReason}` };
  },

  createLocal: () => ({ selectedCardIndex: null }),

  render: renderDracula,
});
