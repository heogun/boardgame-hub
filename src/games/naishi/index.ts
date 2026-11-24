import { defineGame, IllegalAction } from '../../framework/types';
import type { NaishiCard, NaishiGameState } from './types';

import {
  calculateScore,
  createInitialGameState,
  declareEnd,
  develop,
  endTurn,
  imperialDecree,
  recallEmissaries,
  removeFromRiver,
  swapPositions,
} from './game';
import { renderNaishi, type NaishiAction, type NaishiLocal } from './ui';

/** view 에서 가린 카드 (렌더러가 뒷면으로 그린다) */
const HIDDEN_CARD = { type: 'hidden', id: -1 } as unknown as NaishiCard;

export default defineGame<NaishiGameState, NaishiAction, NaishiLocal>({
  id: 'naishi',
  name: '나이시 (Naishi)',
  description: '2인 전략 카드 게임',
  icon: 'ph-swords',
  minPlayers: 2,
  maxPlayers: 2,

  setup: ({ players }) => createInitialGameState(players[0].id, players[1].id),

  reduce(gs, action, { playerId, players }) {
    if (gs.phase !== 'playing') throw new IllegalAction('게임이 끝났습니다.');
    if (gs.currentPlayer !== playerId) throw new IllegalAction('당신의 차례가 아닙니다.');
    const name = players.find((p) => p.id === playerId)?.name ?? '?';
    let next: NaishiGameState;
    switch (action.type) {
      case 'develop':
        next = develop(gs, playerId, action.targetZone, action.targetIndex);
        break;
      case 'recall_emissaries':
        next = recallEmissaries(gs, playerId);
        break;
      case 'declare_end':
        next = declareEnd(gs, playerId);
        break;
      case 'swap_positions':
        next = swapPositions(gs, playerId, action.zone, action.index1, action.index2);
        break;
      case 'remove_from_river':
        next = removeFromRiver(gs, playerId, action.index1, action.index2);
        break;
      case 'imperial_decree':
        next = imperialDecree(gs, playerId, action.zone, action.targetIndex);
        break;
      case 'end_turn':
        return endTurn(gs);
      default:
        throw new IllegalAction('알 수 없는 액션입니다.');
    }
    if (action.type !== 'declare_end') next.lastAction = `${name}: ${next.lastAction}`;
    else next.lastAction = `${name}이(가) ${next.lastAction}`;
    return next;
  },

  // 상대 손패는 가린다
  view(gs, viewerId) {
    if (gs.phase === 'game_over') return gs;
    const players: NaishiGameState['players'] = {};
    for (const [id, p] of Object.entries(gs.players)) {
      players[id] = id === viewerId ? p : { ...p, hand: p.hand.map((c) => (c ? HIDDEN_CARD : null)) };
    }
    // 강 더미는 공개된 맨 위 카드(river)와 장수(riverSizes)만 보인다
    return { ...gs, players, riverPiles: gs.riverPiles.map(() => []) };
  },

  result(gs, players) {
    if (gs.phase !== 'game_over') return null;
    const [a, b] = players.map((p) => ({ name: p.name, score: calculateScore(gs, p.id) }));
    if (a.score === b.score) return { summary: `무승부 (${a.score}점)` };
    const w = a.score > b.score ? a : b;
    return { summary: `${w.name} 승리 (${a.score} : ${b.score})` };
  },

  createLocal: () => ({ mode: 'develop', picks: [] }),

  render: renderNaishi,
});
