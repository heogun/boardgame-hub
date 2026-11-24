import { defineGame, IllegalAction } from '../../framework/types';
import type { Level10GameState } from './types';
import { createInitialGameState, playCard, prepareNextLevel, useThrowingStar } from './game';
import { renderLevel10, type Level10Action } from './ui';

export default defineGame<Level10GameState, Level10Action>({
  id: 'level10',
  name: '레벨 10 (The Mind)',
  description: '말없이 숫자 순서를 맞추는 협동 카드 게임',
  icon: 'ph-cards',
  minPlayers: 2,
  maxPlayers: 4,

  setup: ({ players }) => createInitialGameState(players.map((p) => p.id), players.length),

  reduce(gs, action, { playerId, players }) {
    switch (action.type) {
      case 'play':
        if (gs.phase !== 'playing') throw new IllegalAction('지금은 카드를 낼 수 없습니다.');
        return playCard(gs, playerId, action.value).gs;

      case 'ready':
        if (gs.phase !== 'concentration') throw new IllegalAction('지금은 준비 단계가 아닙니다.');
        return { ...gs, phase: 'playing' };

      case 'pause':
        if (gs.phase !== 'playing') throw new IllegalAction('진행 중일 때만 일시정지할 수 있습니다.');
        return { ...gs, phase: 'concentration', starVote: null };

      case 'resume':
        if (gs.phase !== 'error_pause') throw new IllegalAction('지금은 재개할 수 없습니다.');
        return { ...gs, phase: 'playing' };

      case 'next_level':
        if (gs.phase !== 'level_complete') throw new IllegalAction('레벨을 아직 클리어하지 않았습니다.');
        return prepareNextLevel(gs, players.map((p) => p.id));

      case 'suggest_star':
        if (gs.phase !== 'playing') throw new IllegalAction('진행 중일 때만 제안할 수 있습니다.');
        if (gs.throwingStars <= 0) throw new IllegalAction('남은 별이 없습니다.');
        if (gs.starVote) throw new IllegalAction('이미 투표가 진행 중입니다.');
        return { ...gs, starVote: { suggesterId: playerId, agreed: [playerId] } };

      case 'vote_star': {
        if (!gs.starVote) throw new IllegalAction('진행 중인 투표가 없습니다.');
        if (!action.agree) return { ...gs, starVote: null };
        const agreed = [...new Set([...gs.starVote.agreed, playerId])];
        if (players.every((p) => agreed.includes(p.id))) return useThrowingStar(gs);
        return { ...gs, starVote: { ...gs.starVote, agreed } };
      }
    }
    throw new IllegalAction('알 수 없는 액션입니다.');
  },

  // 다른 사람의 카드 값은 숨기고 장수만 보여준다
  view: (gs, viewerId) => ({
    ...gs,
    players: gs.players.map((h) => (h.playerId === viewerId ? h : { ...h, cards: h.cards.map(() => 0) })),
  }),

  result(gs) {
    if (gs.phase === 'game_over_victory') return { summary: `승리! ${gs.maxLevel}레벨 모두 클리어` };
    if (gs.phase === 'game_over_defeat') return { summary: `패배 — 레벨 ${gs.currentLevel}에서 생명 소진` };
    return null;
  },

  render: renderLevel10,
});
