import { defineGame, IllegalAction } from '../../framework/types';
import type { NaishiCard, NaishiGameState } from './types';

/** view 에서 가린 카드 (렌더러가 뒷면으로 그린다) */
const HIDDEN_CARD = { type: 'hidden', id: -1 } as unknown as NaishiCard;
import { calculateScore, canDeclareEnd, createInitialGameState, declareEnd } from './game';
import { renderNaishi, type NaishiAction } from './ui';

export default defineGame<NaishiGameState, NaishiAction>({
  id: 'naishi',
  name: '나이시 (Naishi)',
  description: '2인 전략 카드 게임 (일부 규칙 미구현)',
  icon: 'ph-swords',
  minPlayers: 2,
  maxPlayers: 2,

  setup: ({ players }) => createInitialGameState(players[0].id, players[1].id),

  reduce(gs, action, { playerId }) {
    if (gs.phase !== 'playing') throw new IllegalAction('게임이 끝났습니다.');
    if (gs.currentPlayer !== playerId) throw new IllegalAction('당신의 차례가 아닙니다.');
    switch (action.type) {
      case 'end_turn':
        return { ...gs, currentPlayer: Object.keys(gs.players).find((id) => id !== playerId)! };
      case 'declare_end':
        if (!canDeclareEnd(gs)) throw new IllegalAction('아직 종료를 선언할 수 없습니다.');
        return declareEnd(gs);
    }
    throw new IllegalAction('알 수 없는 액션입니다.');
  },

  // 상대 손패는 가린다
  view(gs, viewerId) {
    if (gs.phase === 'game_over') return gs;
    const players: NaishiGameState['players'] = {};
    for (const [id, p] of Object.entries(gs.players)) {
      players[id] = id === viewerId ? p : { ...p, hand: p.hand.map((c) => (c ? HIDDEN_CARD : null)) };
    }
    return { ...gs, players };
  },

  result(gs, players) {
    if (gs.phase !== 'game_over') return null;
    const [a, b] = players.map((p) => ({ name: p.name, score: calculateScore(gs, p.id) }));
    if (a.score === b.score) return { summary: `무승부 (${a.score}점)` };
    const w = a.score > b.score ? a : b;
    return { summary: `${w.name} 승리 (${a.score} : ${b.score})` };
  },

  render: renderNaishi,
});
