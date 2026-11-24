import { defineGame, IllegalAction } from '../../framework/types';
import type { CosmoGameState } from './types';
import { createInitialGameState, determineWinner, drawCard, maskStateFor, passBet, placeBet } from './game';
import { renderCosmo, type CosmoAction, type CosmoLocal } from './ui';

export default defineGame<CosmoGameState, CosmoAction, CosmoLocal>({
  id: 'cosmo',
  name: '코스모 (Cosmo)',
  description: '포커 핸드 빌딩 카드 게임',
  icon: 'ph-rocket',
  minPlayers: 2,
  maxPlayers: 5,

  setup: ({ players }) => createInitialGameState(players.map((p) => p.id)),

  reduce(gs, action, { playerId, players }) {
    if (gs.currentTurn !== playerId) throw new IllegalAction('당신의 차례가 아닙니다.');

    let next: CosmoGameState;
    switch (action.type) {
      case 'draw':
        next = drawCard(gs, playerId, action.deckIndex, action.reveal);
        break;
      case 'bet':
        next = placeBet(gs, playerId, action.amount, action.target, action.targetPlayerId);
        break;
      case 'pass':
        next = passBet(gs, playerId);
        break;
      default:
        throw new IllegalAction('알 수 없는 액션입니다.');
    }
    // 게임 로직은 잘못된 입력에 원래 상태를 그대로 돌려준다
    if (next === gs) throw new IllegalAction('지금은 할 수 없는 행동입니다.');

    if (next.phase === 'showdown') {
      next = determineWinner(next, (id) => players.find((p) => p.id === id)?.name ?? '?');
    }
    return next;
  },

  view: maskStateFor,

  result(gs, players) {
    if (gs.phase !== 'game_over') return null;
    return { summary: `${players.find((p) => p.id === gs.winner)?.name ?? '?'} 승리` };
  },

  createLocal: () => ({ selectedDeck: null }),

  render: renderCosmo,
});
