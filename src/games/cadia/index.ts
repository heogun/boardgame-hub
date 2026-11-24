import { defineGame, IllegalAction } from '../../framework/types';
import type { CardiaDeckType, CardiaGameState } from './types';
import { createInitialGameState, LOCATIONS, playCard, putOnBottom, resolveChoice, UNSUPPORTED_LOCATIONS } from './game';
import { HIDDEN_CARD, renderCardia, type CardiaAction } from './ui';

export default defineGame<CardiaGameState, CardiaAction>({
  id: 'cadia',
  name: '카르디아 (Duel for Cardia)',
  description: '동시에 카드를 내 영향력을 겨루는 듀얼',
  icon: 'ph-crown',
  minPlayers: 2,
  maxPlayers: 2,
  options: [
    {
      key: 'deck',
      label: '덱',
      default: 'deck1',
      choices: [
        { value: 'deck1', label: 'Deck I', description: '기본 능력' },
        { value: 'deck2', label: 'Deck II', description: '고급 능력 (+1 난이도)' },
      ],
    },
    {
      key: 'location',
      label: '장소',
      default: '',
      choices: [
        { value: '', label: '장소 없음', description: '기본 게임' },
        ...LOCATIONS.filter((l) => !UNSUPPORTED_LOCATIONS.includes(l.id)).map((l) => ({
          value: l.id,
          label: `${l.name} ${'★'.repeat(l.stars)}`,
          description: l.ability,
        })),
      ],
    },
  ],

  setup({ players, options }) {
    const location = LOCATIONS.find((l) => l.id === options.location && !UNSUPPORTED_LOCATIONS.includes(l.id)) ?? null;
    return createInitialGameState(players[0].id, players[1].id, options.deck as CardiaDeckType, location);
  },

  reduce(gs, action, { playerId, players }) {
    if (gs.phase !== 'playing') throw new IllegalAction('게임이 끝났습니다.');
    if (!gs.players[playerId]) throw new IllegalAction('참가자가 아닙니다.');
    const names = (id: string) => players.find((p) => p.id === id)?.name ?? '?';
    switch (action.type) {
      case 'play':
        return playCard(gs, playerId, action.card, names);
      case 'bottom':
        return putOnBottom(gs, playerId, action.card);
      case 'choose_card':
      case 'choose_faction':
      case 'choose_hand':
      case 'choose_option':
        return resolveChoice(gs, playerId, action, names);
    }
    throw new IllegalAction('알 수 없는 액션입니다.');
  },

  // 상대의 손패·덱, 아직 공개되지 않은 상대 카드는 가린다
  view(gs, viewerId) {
    if (gs.phase === 'game_over') return gs;
    // 궁정 경비병: 능력을 쓰는 동안에는 상대 손패를 본다
    const peeking = gs.choice?.ability === 'Palace Guard' && gs.choice.playerId === viewerId;
    const players: CardiaGameState['players'] = {};
    for (const [id, p] of Object.entries(gs.players)) {
      players[id] =
        id === viewerId
          ? { ...p, deck: p.deck.map(() => HIDDEN_CARD) }
          : { ...p, hand: peeking ? p.hand : p.hand.map(() => HIDDEN_CARD), deck: p.deck.map(() => HIDDEN_CARD) };
    }
    // 점쟁이 효과로 먼저 낸 카드는 앞면으로 공개된다
    const pending: Record<string, number> = {};
    for (const [id, card] of Object.entries(gs.pending)) pending[id] = id === viewerId || id === gs.playsFirst ? card : HIDDEN_CARD;
    return { ...gs, players, pending };
  },

  result(gs, players) {
    if (gs.phase !== 'game_over') return null;
    if (!gs.winner) return { summary: `무승부 — ${gs.winnerReason}` };
    return { summary: `${players.find((p) => p.id === gs.winner)?.name ?? '?'} 승리 — ${gs.winnerReason}` };
  },

  render: renderCardia,
});
