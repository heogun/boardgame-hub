import { defineGame, IllegalAction } from '../../framework/types';
import type { CardiaDeckType, CardiaGameState } from './types';
import { checkWinner, createInitialGameState, LOCATIONS, resolveEncounter } from './game';
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
        ...LOCATIONS.map((l) => ({ value: l.id, label: `${l.name} ${'★'.repeat(l.stars)}`, description: l.ability })),
      ],
    },
  ],

  setup({ players, options }) {
    const location = LOCATIONS.find((l) => l.id === options.location) ?? null;
    return createInitialGameState(players[0].id, players[1].id, options.deck as CardiaDeckType, location);
  },

  reduce(gs, action, { playerId }) {
    if (gs.phase !== 'playing') throw new IllegalAction('게임이 끝났습니다.');
    const me = gs.players[playerId];
    if (gs.pending[playerId] !== undefined) throw new IllegalAction('이미 이번 조우에 카드를 냈습니다.');
    const at = me.hand.indexOf(action.card);
    if (at === -1) throw new IllegalAction('손에 없는 카드입니다.');

    me.hand.splice(at, 1);
    gs.pending[playerId] = action.card;

    const [p1, p2] = Object.keys(gs.players);
    if (gs.pending[p1] === undefined || gs.pending[p2] === undefined) return gs;

    // 둘 다 냈으면 공개하고 판정한다
    gs.encounters.push({
      player1Card: gs.pending[p1],
      player2Card: gs.pending[p2],
      player1Signet: false,
      player2Signet: false,
      player1Modifiers: [],
      player2Modifiers: [],
      ongoingTokens: [],
    });
    gs.pending = {};
    let next = resolveEncounter(gs, gs.encounters.length - 1);
    for (const id of [p1, p2]) {
      const p = next.players[id];
      const drawn = p.deck.shift();
      if (drawn !== undefined) p.hand.push(drawn);
    }
    next = { ...next, round: next.round + 1 };

    const winner = checkWinner(next);
    const outOfCards = [p1, p2].every((id) => next.players[id].hand.length === 0);
    if (winner || outOfCards || next.encounters.length >= next.maxRounds) {
      const s1 = next.signets[p1] ?? 0;
      const s2 = next.signets[p2] ?? 0;
      const finalWinner = winner ?? (s1 === s2 ? null : s1 > s2 ? p1 : p2);
      next = {
        ...next,
        phase: 'game_over',
        winner: finalWinner,
        winnerReason: (next.signets[finalWinner ?? ''] ?? 0) >= 5 ? '인장 5개 획득' : '모든 조우 종료',
      };
    }
    return next;
  },

  // 상대의 손패·덱, 아직 공개되지 않은 상대 카드는 가린다
  view(gs, viewerId) {
    if (gs.phase === 'game_over') return gs;
    const players: CardiaGameState['players'] = {};
    for (const [id, p] of Object.entries(gs.players)) {
      players[id] = id === viewerId ? p : { ...p, hand: p.hand.map(() => HIDDEN_CARD), deck: p.deck.map(() => HIDDEN_CARD) };
    }
    const pending: Record<string, number> = {};
    for (const [id, card] of Object.entries(gs.pending)) pending[id] = id === viewerId ? card : HIDDEN_CARD;
    return { ...gs, players, pending };
  },

  result(gs, players) {
    if (gs.phase !== 'game_over') return null;
    if (!gs.winner) return { summary: '무승부' };
    return { summary: `${players.find((p) => p.id === gs.winner)?.name ?? '?'} 승리 — ${gs.winnerReason}` };
  },

  render: renderCardia,
});
