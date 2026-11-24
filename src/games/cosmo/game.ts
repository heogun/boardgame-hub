import type { CosmoCard, CosmoGameState, CosmoPlayerState, CosmoHandResult, CosmoSuit, CosmoHandRank } from './types';

const SUITS: CosmoSuit[] = ['A', 'B', 'C', 'D', 'E', 'F'];
const RANKS = [1, 2, 3, 4, 5, 6];
const HAND_SIZE = 5;
const STARTING_MONEY = 5;
const NUM_DECKS = 6;
const CARDS_PER_DECK = 6;

function createDeck(): CosmoCard[] {
  const deck: CosmoCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealDecks(): CosmoCard[][] {
  const allCards = shuffleArray(createDeck());
  const decks: CosmoCard[][] = [];
  for (let i = 0; i < NUM_DECKS; i++) {
    decks.push(allCards.slice(i * CARDS_PER_DECK, (i + 1) * CARDS_PER_DECK));
  }
  return decks;
}

export function createInitialGameState(playerIds: string[]): CosmoGameState {
  const decks = dealDecks();
  const players: Record<string, CosmoPlayerState> = {};

  for (const id of playerIds) {
    players[id] = {
      hand: [],
      visibleCards: [],
      hiddenCards: [],
      money: STARTING_MONEY,
      bet: null,
      hasBet: false,
    };
  }

  return {
    phase: 'drawing',
    players,
    decks,
    currentTurn: playerIds[0],
    round: 1,
    maxRounds: HAND_SIZE,
    pot: 0,
    winner: null,
    winnerReason: '',
    playerOrder: playerIds,
  };
}

export function drawCard(gs: CosmoGameState, playerId: string, deckIndex: number, reveal: boolean): CosmoGameState {
  if (gs.phase !== 'drawing') return gs;
  if (gs.currentTurn !== playerId) return gs;
  if (deckIndex < 0 || deckIndex >= NUM_DECKS) return gs;

  const deck = gs.decks[deckIndex];
  if (deck.length === 0) return gs;

  const card = deck[deck.length - 1];
  const newDeck = deck.slice(0, -1);
  const newDecks = [...gs.decks];
  newDecks[deckIndex] = newDeck;

  const player = gs.players[playerId];
  const newHand = [...player.hand, card];
  const newVisibleCards = reveal ? [...player.visibleCards, card] : player.visibleCards;
  const newHiddenCards = reveal ? player.hiddenCards : [...player.hiddenCards, card];

  const newPlayers = {
    ...gs.players,
    [playerId]: {
      ...player,
      hand: newHand,
      visibleCards: newVisibleCards,
      hiddenCards: newHiddenCards,
    },
  };

  const currentPlayerIndex = gs.playerOrder.indexOf(playerId);
  const nextPlayerIndex = (currentPlayerIndex + 1) % gs.playerOrder.length;
  const nextPlayer = gs.playerOrder[nextPlayerIndex];

  const allFull = gs.playerOrder.every((id) => newPlayers[id].hand.length >= HAND_SIZE);
  const newPhase = allFull ? 'betting' : 'drawing';
  const newRound = !allFull && nextPlayerIndex === 0 ? gs.round + 1 : gs.round;

  return {
    ...gs,
    phase: newPhase,
    players: newPlayers,
    decks: newDecks,
    currentTurn: nextPlayer,
    round: newRound,
  };
}

export function placeBet(gs: CosmoGameState, playerId: string, amount: number, target: 'self' | 'opponent', targetPlayerId?: string): CosmoGameState {
  if (gs.phase !== 'betting') return gs;
  if (gs.currentTurn !== playerId) return gs;

  const player = gs.players[playerId];
  if (!Number.isInteger(amount) || amount <= 0) return gs;
  if (player.money < amount) return gs;
  if (player.hasBet) return gs;
  if (target === 'opponent') {
    if (!targetPlayerId || targetPlayerId === playerId || !gs.players[targetPlayerId]) return gs;
  } else {
    targetPlayerId = undefined;
  }

  const newPlayers = {
    ...gs.players,
    [playerId]: {
      ...player,
      money: player.money - amount,
      bet: { playerId, amount, target, targetPlayerId },
      hasBet: true,
    },
  };

  const newPot = gs.pot + amount;

  const currentPlayerIndex = gs.playerOrder.indexOf(playerId);
  const nextPlayerIndex = (currentPlayerIndex + 1) % gs.playerOrder.length;
  const nextPlayer = gs.playerOrder[nextPlayerIndex];

  const allBet = gs.playerOrder.every((id) => newPlayers[id].hasBet);
  const newPhase = allBet ? 'showdown' : 'betting';

  return {
    ...gs,
    phase: newPhase,
    players: newPlayers,
    decks: gs.decks,
    currentTurn: nextPlayer,
    pot: newPot,
  };
}

export function passBet(gs: CosmoGameState, playerId: string): CosmoGameState {
  if (gs.phase !== 'betting') return gs;
  if (gs.currentTurn !== playerId) return gs;

  const player = gs.players[playerId];
  if (player.hasBet) return gs;

  const newPlayers = {
    ...gs.players,
    [playerId]: {
      ...player,
      hasBet: true,
      bet: null,
    },
  };

  const currentPlayerIndex = gs.playerOrder.indexOf(playerId);
  const nextPlayerIndex = (currentPlayerIndex + 1) % gs.playerOrder.length;
  const nextPlayer = gs.playerOrder[nextPlayerIndex];

  const allBet = gs.playerOrder.every((id) => newPlayers[id].hasBet);
  const newPhase = allBet ? 'showdown' : 'betting';

  return {
    ...gs,
    phase: newPhase,
    players: newPlayers,
    decks: gs.decks,
    currentTurn: nextPlayer,
  };
}

export function evaluateHand(cards: CosmoCard[]): CosmoHandResult {
  const sorted = [...cards].sort((a, b) => a.rank - b.rank);

  const complete = sorted.length === HAND_SIZE;
  const isFlush = complete && sorted.every((c) => c.suit === sorted[0].suit);
  const isStraight = complete && sorted.every((c, i) => i === 0 || c.rank === sorted[i - 1].rank + 1);
  // 랭크가 1~6이므로 가장 높은 스트레이트 플러시(2-3-4-5-6)를 로얄 플러시로 취급
  const isRoyalFlush = isFlush && isStraight && sorted[HAND_SIZE - 1].rank === 6;

  const rankCounts = new Map<number, number>();
  for (const card of sorted) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
  }
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);

  // 족보 단계(tier) * 1000 + 동급 비교용 보조 점수(<1000) — 상위 족보가 항상 하위 족보를 이김
  const sum = sorted.reduce((acc, c) => acc + c.rank, 0);
  const groupRank = (n: number) => Math.max(...[...rankCounts].filter(([, c]) => c === n).map(([r]) => r));
  const high = sorted.length > 0 ? sorted[sorted.length - 1].rank : 0;

  let rank: CosmoHandRank;
  let tier: number;
  let tiebreak: number;

  if (isRoyalFlush) {
    rank = 'royal_flush';
    tier = 9;
    tiebreak = 0;
  } else if (isFlush && isStraight) {
    rank = 'straight_flush';
    tier = 8;
    tiebreak = high;
  } else if (counts[0] === 4) {
    rank = 'four_of_a_kind';
    tier = 7;
    tiebreak = groupRank(4) * 20 + groupRank(1);
  } else if (counts[0] === 3 && counts[1] === 2) {
    rank = 'full_house';
    tier = 6;
    tiebreak = groupRank(3) * 20 + groupRank(2);
  } else if (isFlush) {
    rank = 'flush';
    tier = 5;
    tiebreak = sum;
  } else if (isStraight) {
    rank = 'straight';
    tier = 4;
    tiebreak = high;
  } else if (counts[0] === 3) {
    rank = 'three_of_a_kind';
    tier = 3;
    tiebreak = groupRank(3) * 20 + (sum - groupRank(3) * 3);
  } else if (counts[0] === 2 && counts[1] === 2) {
    rank = 'two_pair';
    tier = 2;
    const pairs = [...rankCounts].filter(([, c]) => c === 2).map(([r]) => r).sort((a, b) => b - a);
    tiebreak = pairs[0] * 100 + pairs[1] * 20 + (sum - (pairs[0] + pairs[1]) * 2);
  } else if (counts[0] === 2) {
    rank = 'one_pair';
    tier = 1;
    tiebreak = groupRank(2) * 20 + (sum - groupRank(2) * 2);
  } else {
    rank = 'high_card';
    tier = 0;
    tiebreak = sum;
  }

  const score = tier * 1000 + tiebreak;
  return { rank, cards: sorted, score };
}

export function determineWinner(gs: CosmoGameState, nameOf: (id: string) => string = (id) => id): CosmoGameState {
  if (gs.phase !== 'showdown') return gs;

  const results = gs.playerOrder.map((id) => ({
    id,
    hand: evaluateHand(gs.players[id].hand),
  }));

  results.sort((a, b) => b.hand.score - a.hand.score);

  const winnerId = results[0].id;
  const isTie = results.length > 1 && results[1].hand.score === results[0].hand.score;
  let winnerReason = `${getHandRankName(results[0].hand.rank)} (점수: ${results[0].hand.score})`;
  if (isTie) winnerReason += ' · 동점 (먼저 순서인 플레이어 승리)';

  // 베팅 정산: 팟에 낸 판돈은 이미 차감됨. 적중 시 판돈의 2배를 돌려받고, 실패 시 판돈을 잃음.
  const players = { ...gs.players };
  const successes: string[] = [];
  for (const id of gs.playerOrder) {
    const bet = players[id].bet;
    if (!bet) continue;
    const pickedId = bet.target === 'self' ? id : bet.targetPlayerId;
    if (pickedId === winnerId) {
      players[id] = { ...players[id], money: players[id].money + bet.amount * 2 };
      successes.push(`${nameOf(id)} +${bet.amount * 2}★`);
    }
  }
  if (successes.length > 0) winnerReason += ` · 베팅 적중: ${successes.join(', ')}`;

  return {
    ...gs,
    players,
    pot: 0,
    phase: 'game_over',
    winner: winnerId,
    winnerReason,
  };
}

function getHandRankName(rank: CosmoHandRank): string {
  const names: Record<CosmoHandRank, string> = {
    royal_flush: '로얄 플러시',
    straight_flush: '스트레이트 플러시',
    four_of_a_kind: '포 카드',
    full_house: '풀 하우스',
    flush: '플러시',
    straight: '스트레이트',
    three_of_a_kind: '트리플',
    two_pair: '투 페어',
    one_pair: '원 페어',
    high_card: '하이 카드',
  };
  return names[rank];
}

export function canDrawFromDeck(gs: CosmoGameState, deckIndex: number): boolean {
  if (gs.phase !== 'drawing') return false;
  if (deckIndex < 0 || deckIndex >= NUM_DECKS) return false;
  return gs.decks[deckIndex].length > 0;
}

export function getRemainingCards(gs: CosmoGameState): number {
  return gs.decks.reduce((sum, deck) => sum + deck.length, 0);
}

export function getPlayerMoney(gs: CosmoGameState, playerId: string): number {
  return gs.players[playerId]?.money ?? 0;
}

export function getHandStrength(gs: CosmoGameState, playerId: string): CosmoHandResult {
  return evaluateHand(gs.players[playerId]?.hand ?? []);
}

// 뒷면 카드 자리표시자 (실제 값 없음)
const HIDDEN_CARD: CosmoCard = { suit: 'A', rank: 0 };

/** viewer 가 볼 수 없는 정보(다른 플레이어의 숨긴 카드, 덱 내용)를 가린다. 게임이 끝나면 모두 공개. */
export function maskStateFor(gs: CosmoGameState, viewerId: string): CosmoGameState {
  if (gs.phase === 'game_over') return gs;

  const players: CosmoGameState['players'] = {};
  for (const [id, p] of Object.entries(gs.players)) {
    if (id === viewerId) {
      players[id] = p;
    } else {
      const hidden = p.hiddenCards.map(() => HIDDEN_CARD);
      players[id] = { ...p, hiddenCards: hidden, hand: [...p.visibleCards, ...hidden] };
    }
  }

  return {
    ...gs,
    players,
    decks: gs.decks.map((deck) => deck.map(() => HIDDEN_CARD)),
  };
}
