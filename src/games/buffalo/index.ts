import { defineGame, IllegalAction } from '../../framework/types';
import type { BuffaloGameState } from './types';
import { createInitialGameState, getPieceAt, movePiece } from './game';
import { ownsPiece, renderBuffalo, roleOf, type BuffaloAction, type BuffaloLocal } from './ui';

export default defineGame<BuffaloGameState, BuffaloAction, BuffaloLocal>({
  id: 'buffalo',
  name: '버팔로 체스',
  description: '비대칭 추상 전략 게임 (버팔로 vs 족장)',
  icon: 'ph-horse',
  minPlayers: 2,
  maxPlayers: 2,

  // 0번(방장) = 버팔로, 1번 = 족장
  setup: ({ players }) => createInitialGameState(players[0].id, players[1].id),

  reduce(gs, action, { playerId }) {
    if (gs.phase === 'game_over') throw new IllegalAction('게임이 끝났습니다.');
    const role = roleOf(gs, playerId);
    if (role !== gs.currentTurn) throw new IllegalAction('당신의 차례가 아닙니다.');
    if (!ownsPiece(role, getPieceAt(gs, action.fromRow, action.fromCol))) throw new IllegalAction('당신의 말이 아닙니다.');
    const next = movePiece(gs, action.fromRow, action.fromCol, action.toRow, action.toCol);
    if (next === gs) throw new IllegalAction('그곳으로는 움직일 수 없습니다.');
    return next;
  },

  result(gs) {
    if (gs.phase !== 'game_over') return null;
    return { summary: `${gs.winner === 'buffalo' ? '버팔로' : '인디언 족장'} 승리 — ${gs.winnerReason}` };
  },

  createLocal: () => ({ selectedPiece: null }),

  render: renderBuffalo,
});
