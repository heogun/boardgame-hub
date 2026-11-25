import { defineGame } from '../../framework/types';
import { applyAction, roseCount, score, setupState, type RoseWarAction, type RoseWarState } from './game';
import { HIDDEN_CARD, renderRoseWar, type RoseWarLocal } from './ui';

export default defineGame<RoseWarState, RoseWarAction, RoseWarLocal>({
  id: 'rose_war',
  name: '장미 전쟁',
  description: '깃발을 움직여 장미 정원을 차지하는 2인 영역 대결',
  icon: 'ph-flower',
  minPlayers: 2,
  maxPlayers: 2,

  // 0번(방장) = 붉은 가문, 선 플레이어
  setup: ({ players }) => setupState(players.map((p) => p.id)),

  reduce(gs, action, { playerId, players }) {
    const name = players.find((p) => p.id === playerId)?.name ?? '?';
    return applyAction(gs, action, playerId, name);
  },

  // 상대 손패와 덱 순서는 비공개 (장수만 보인다). 버린 카드는 공개.
  view(gs, viewerId) {
    const players: RoseWarState['players'] = {};
    for (const [id, p] of Object.entries(gs.players)) {
      players[id] = id === viewerId || gs.over ? p : { ...p, hand: p.hand.map(() => HIDDEN_CARD) };
    }
    return { ...gs, players, deck: gs.deck.map(() => HIDDEN_CARD) };
  },

  result(gs, players) {
    if (!gs.over) return null;
    const [a, b] = gs.order.map((id) => {
      const house = gs.players[id].house;
      return { name: players.find((p) => p.id === id)?.name ?? '?', score: score(gs, house), roses: roseCount(gs, house) };
    });
    if (a.score !== b.score) {
      const w = a.score > b.score ? a : b;
      return { summary: `${w.name} 승리 (${a.score} : ${b.score}점)` };
    }
    if (a.roses !== b.roses) {
      const w = a.roses > b.roses ? a : b;
      return { summary: `${w.name} 승리 — 동점(${a.score}점), 장미 수 ${a.roses} : ${b.roses}` };
    }
    return { summary: `무승부 (${a.score}점)` };
  },

  createLocal: () => ({ selected: null }),

  render: renderRoseWar,
});
