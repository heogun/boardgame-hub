import { defineGame, IllegalAction } from '../../framework/types';
import type { CardSuit, DraculaCard, DraculaGameState, DraculaRole, DraculaTurnStep } from './types';
import {
  canEndRound,
  createInitialGameState,
  discardCard,
  drawCard,
  getTrumpSuit,
  resolveRound,
  revealCard,
  startNewRound,
  swapTrump,
  swapTwoCards,
  swapWithOpponent,
} from './game';
import { renderDracula, SUIT_NAME, type DraculaAction, type DraculaLocal } from './ui';

/*
 * 턴 진행 (구현 가정 — 원작 규칙을 단순화했다):
 *  1) 뽑기: 덱에서 한 장 뽑는다. 버림 더미가 6장 이상이면 뽑는 대신 라운드를 끝낼 수 있다
 *     (덱이 비면 라운드를 끝내야 한다).
 *  2) 배치: 뽑은 카드를 그대로 버리거나, 내 구역 카드 하나와 바꾸고 그 카드를 버린다.
 *  3) 능력: 방금 버린 카드의 색에 따라 능력 하나를 쓸 수 있다(선택). 그 뒤 상대 턴.
 *       빨강 — 상대 카드 한 장을 공개하거나 덱 맨 위를 엿본다
 *       파랑 — 내 카드 두 장의 자리를 바꾼다
 *       초록 — 같은 구역에서 상대와 카드를 맞바꾼다
 *       노랑 — 트럼프 색을 바꾼다
 */
const ROLE_NAME: Record<DraculaRole, string> = { dracula: '드라큘라', van_helsing: '반헬싱' };

function requireStep(gs: DraculaGameState, step: DraculaTurnStep) {
  if (gs.step === step) return;
  const msg: Record<DraculaTurnStep, string> = {
    draw: '먼저 카드를 뽑으세요.',
    place: '먼저 뽑은 카드를 버리거나 내 카드와 교체하세요.',
    ability: '능력을 쓰거나 건너뛰세요.',
  };
  throw new IllegalAction(msg[gs.step]);
}

function requireAbility(gs: DraculaGameState, suit: CardSuit) {
  requireStep(gs, 'ability');
  if (gs.pendingAbility !== suit) throw new IllegalAction('버린 카드의 색으로는 이 능력을 쓸 수 없습니다.');
}

function passTurn(gs: DraculaGameState, lastAction: string): DraculaGameState {
  return {
    ...gs,
    currentPlayer: gs.currentPlayer === 'dracula' ? 'van_helsing' : 'dracula',
    step: 'draw',
    pendingAbility: null,
    lastAction,
  };
}

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
    const who = ROLE_NAME[me.role];

    switch (action.type) {
      // ── 1단계: 뽑기 또는 라운드 종료 ──
      case 'draw': {
        requireStep(gs, 'draw');
        if (gs.deck.length === 0) throw new IllegalAction('덱이 비었습니다. 라운드를 종료하세요.');
        const next = drawCard(gs, playerId);
        // 덱 맨 위를 엿본 정보는 그 카드가 뽑히면 의미가 없다
        for (const p of Object.values(next.players)) p.revealedDeckCard = undefined;
        next.step = 'place';
        next.lastAction = `${who}이(가) 카드를 뽑았습니다.`;
        return next;
      }
      case 'end_round': {
        requireStep(gs, 'draw');
        if (!canEndRound(gs) && gs.deck.length > 0) throw new IllegalAction('아직 라운드를 끝낼 수 없습니다.');
        const resolved = resolveRound(gs);
        if (resolved.phase === 'game_over') return resolved;
        // 마지막 라운드가 끝나도 드라큘라가 살아 있으면 드라큘라 승리
        if (resolved.round >= resolved.maxRounds) return startNewRound(resolved);
        return { ...resolved, phase: 'round_end', lastAction: `${who}이(가) 라운드를 끝냈습니다.` };
      }

      // ── 2단계: 뽑은 카드 버리기 / 랙과 교체 ──
      case 'discard': {
        requireStep(gs, 'place');
        const drawn = me.drawnCard;
        if (!drawn) throw new IllegalAction('뽑은 카드가 없습니다.');
        let next: DraculaGameState;
        let discarded: DraculaCard;
        if (action.swapIndex === undefined) {
          next = discardCard(gs, playerId, drawn);
          discarded = drawn;
          next.lastAction = `${who}이(가) 뽑은 카드를 버렸습니다.`;
        } else {
          if (!validIndex(action.swapIndex)) throw new IllegalAction('잘못된 위치입니다.');
          const old = me.rack[action.swapIndex];
          if (!old) throw new IllegalAction('빈 자리입니다.');
          next = discardCard(gs, playerId, drawn, action.swapIndex);
          discarded = old;
          // 새로 들어온 카드는 뒷면
          const p = next.players[playerId];
          p.revealedCards = p.revealedCards.filter((i) => i !== action.swapIndex);
          next.lastAction = `${who}이(가) 구역 ${action.swapIndex + 1}의 카드를 교체했습니다.`;
        }
        next.lastAction += ` (버린 카드: ${discarded.value} ${SUIT_NAME[discarded.suit]})`;
        next.step = 'ability';
        next.pendingAbility = discarded.suit;
        return next;
      }

      // ── 3단계: 버린 카드 색의 능력 (한 번, 선택) ──
      case 'swap':
        requireAbility(gs, 'blue');
        if (!validIndex(action.index1) || !validIndex(action.index2) || action.index1 === action.index2) throw new IllegalAction('잘못된 위치입니다.');
        return passTurn(swapTwoCards(gs, playerId, action.index1, action.index2), `${who}이(가) 자기 카드 두 장의 자리를 바꿨습니다.`);
      case 'swap_with_opponent':
        requireAbility(gs, 'green');
        if (!validIndex(action.myIndex)) throw new IllegalAction('잘못된 위치입니다.');
        return passTurn(swapWithOpponent(gs, playerId, action.myIndex), `${who}이(가) 구역 ${action.myIndex + 1}에서 상대와 카드를 맞바꿨습니다.`);
      case 'swap_trump':
        requireAbility(gs, 'yellow');
        if (!gs.colorRanking.includes(action.newTrump)) throw new IllegalAction('잘못된 색입니다.');
        if (action.newTrump === getTrumpSuit(gs)) throw new IllegalAction('이미 트럼프인 색입니다.');
        return passTurn(swapTrump(gs, action.newTrump), `${who}이(가) 트럼프를 ${SUIT_NAME[action.newTrump]}(으)로 바꿨습니다.`);
      case 'reveal': {
        requireAbility(gs, 'red');
        if (action.target === 'deck') {
          if (gs.deck.length === 0) throw new IllegalAction('덱이 비었습니다.');
          return passTurn(revealCard(gs, 'deck', playerId), `${who}이(가) 덱 맨 위 카드를 엿봤습니다.`);
        }
        if (action.target !== 'opponent' || !validIndex(action.index)) throw new IllegalAction('잘못된 위치입니다.');
        const opp = Object.values(gs.players).find((p) => p !== me)!;
        if (opp.revealedCards.includes(action.index)) throw new IllegalAction('이미 공개된 카드입니다.');
        return passTurn(revealCard(gs, 'opponent', playerId, action.index), `${who}이(가) 상대의 구역 ${action.index + 1} 카드를 공개했습니다.`);
      }
      case 'skip_ability':
        requireStep(gs, 'ability');
        return passTurn(gs, `${who}이(가) 능력을 쓰지 않고 턴을 넘겼습니다.`);
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
