import type { DraculaGameState, DraculaCard, DraculaPlayerState, CardSuit, DistrictState } from './types';

const SUITS: CardSuit[] = ['red', 'blue', 'green', 'yellow'];
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8];
const DISTRICTS = 5;
const HUMANS_PER_DISTRICT = 4;
const INITIAL_HP = 12;

function createDeck(): DraculaCard[] {
  const deck: DraculaCard[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
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

function randomColorRanking(): CardSuit[] {
  return shuffleArray([...SUITS]);
}

export function createInitialGameState(draculaId: string, vanHelsingId: string): DraculaGameState {
  const deck = shuffleArray(createDeck());
  const colorRanking = randomColorRanking();

  const draculaRack: (DraculaCard | null)[] = [];
  const vanHelsingRack: (DraculaCard | null)[] = [];

  for (let i = 0; i < 5; i++) {
    draculaRack.push(deck.pop() || null);
    vanHelsingRack.push(deck.pop() || null);
  }

  const districts: DistrictState[] = [];
  for (let i = 0; i < DISTRICTS; i++) {
    districts.push({ humans: HUMANS_PER_DISTRICT, vampires: 0 });
  }

  return {
    round: 1,
    maxRounds: 5,
    phase: 'playing',
    draculaHP: INITIAL_HP,
    maxDraculaHP: INITIAL_HP,
    districts,
    colorRanking,
    deck,
    discardPile: [],
    players: {
      [draculaId]: { role: 'dracula', rack: draculaRack, revealedCards: [] },
      [vanHelsingId]: { role: 'van_helsing', rack: vanHelsingRack, revealedCards: [] },
    },
    currentPlayer: 'dracula',
    step: 'draw',
    pendingAbility: null,
    lastAction: '',
    winner: null,
    winnerReason: '',
  };
}

export function getTrumpSuit(gs: DraculaGameState): CardSuit {
  return gs.colorRanking[gs.colorRanking.length - 1];
}

export function getCardStrength(gs: DraculaGameState, card: DraculaCard): number {
  const trump = getTrumpSuit(gs);
  if (card.suit === trump) return 100 + card.value;
  return card.value;
}

export function compareCards(gs: DraculaGameState, card1: DraculaCard, card2: DraculaCard): number {
  const strength1 = getCardStrength(gs, card1);
  const strength2 = getCardStrength(gs, card2);

  if (strength1 > strength2) return 1;
  if (strength1 < strength2) return -1;

  const rank1 = gs.colorRanking.indexOf(card1.suit);
  const rank2 = gs.colorRanking.indexOf(card2.suit);
  return rank2 - rank1;
}

export function drawCard(gs: DraculaGameState, playerId: string): DraculaGameState {
  if (gs.deck.length === 0) return gs;

  const card = gs.deck[gs.deck.length - 1];
  const newDeck = gs.deck.slice(0, -1);

  const player = gs.players[playerId];
  if (!player) return gs;

  return {
    ...gs,
    deck: newDeck,
    players: {
      ...gs.players,
      [playerId]: { ...player, drawnCard: card },
    },
  };
}

export function discardCard(gs: DraculaGameState, playerId: string, card: DraculaCard, swapIndex?: number): DraculaGameState {
  const player = gs.players[playerId];
  if (!player) return gs;

  const newRack = [...player.rack];
  if (swapIndex !== undefined && swapIndex >= 0 && swapIndex < 5) {
    const existingCard = newRack[swapIndex];
    if (existingCard) {
      newRack[swapIndex] = card;
      card = existingCard;
    }
  }

  const newDiscard = [...gs.discardPile, card];

  return {
    ...gs,
    discardPile: newDiscard,
    players: {
      ...gs.players,
      [playerId]: { ...player, rack: newRack, drawnCard: undefined },
    },
  };
}

export function swapTwoCards(gs: DraculaGameState, playerId: string, index1: number, index2: number): DraculaGameState {
  const player = gs.players[playerId];
  if (!player) return gs;

  const newRack = [...player.rack];
  const temp = newRack[index1];
  newRack[index1] = newRack[index2];
  newRack[index2] = temp;

  // 공개 여부는 카드를 따라간다
  const revealedCards = player.revealedCards.map((i) => (i === index1 ? index2 : i === index2 ? index1 : i));

  return {
    ...gs,
    players: {
      ...gs.players,
      [playerId]: { ...player, rack: newRack, revealedCards },
    },
  };
}

export function swapWithOpponent(gs: DraculaGameState, playerId: string, myIndex: number): DraculaGameState {
  const player = gs.players[playerId];
  if (!player) return gs;

  const opponentId = Object.keys(gs.players).find((id) => id !== playerId);
  if (!opponentId) return gs;

  const opponent = gs.players[opponentId];
  if (!opponent) return gs;

  const myCard = player.rack[myIndex];
  const opponentCard = opponent.rack[myIndex];

  const newMyRack = [...player.rack];
  const newOpponentRack = [...opponent.rack];
  newMyRack[myIndex] = opponentCard;
  newOpponentRack[myIndex] = myCard;

  // 가정: 자리를 옮긴 카드는 다시 뒷면이 된다 (양쪽 모두 해당 위치의 공개 상태 해제)
  return {
    ...gs,
    players: {
      ...gs.players,
      [playerId]: { ...player, rack: newMyRack, revealedCards: player.revealedCards.filter((i) => i !== myIndex) },
      [opponentId]: { ...opponent, rack: newOpponentRack, revealedCards: opponent.revealedCards.filter((i) => i !== myIndex) },
    },
  };
}

export function swapTrump(gs: DraculaGameState, newTrump: CardSuit): DraculaGameState {
  const currentRanking = [...gs.colorRanking];
  const currentTrumpIndex = currentRanking.indexOf(newTrump);
  const lastTrumpIndex = currentRanking.length - 1;

  const temp = currentRanking[currentTrumpIndex];
  currentRanking[currentTrumpIndex] = currentRanking[lastTrumpIndex];
  currentRanking[lastTrumpIndex] = temp;

  return { ...gs, colorRanking: currentRanking };
}

export function revealCard(gs: DraculaGameState, target: 'self' | 'opponent' | 'deck', playerId: string, index?: number): DraculaGameState {
  if (target === 'deck' && gs.deck.length > 0) {
    const topCard = gs.deck[gs.deck.length - 1];
    return {
      ...gs,
      players: {
        ...gs.players,
        [playerId]: {
          ...gs.players[playerId],
          revealedDeckCard: topCard,
        },
      },
    };
  }

  if (index === undefined) return gs;

  if (target === 'self') {
    const player = gs.players[playerId];
    if (!player) return gs;
    return {
      ...gs,
      players: {
        ...gs.players,
        [playerId]: { ...player, revealedCards: [...new Set([...player.revealedCards, index])] },
      },
    };
  }

  if (target === 'opponent') {
    const opponentId = Object.keys(gs.players).find((id) => id !== playerId);
    if (!opponentId) return gs;
    const opponent = gs.players[opponentId];
    if (!opponent) return gs;
    return {
      ...gs,
      players: {
        ...gs.players,
        [opponentId]: { ...opponent, revealedCards: [...new Set([...opponent.revealedCards, index])] },
      },
    };
  }

  return gs;
}

export function resolveRound(gs: DraculaGameState): DraculaGameState {
  const playerIds = Object.keys(gs.players);
  const draculaId = playerIds.find((id) => gs.players[id].role === 'dracula');
  const vanHelsingId = playerIds.find((id) => gs.players[id].role === 'van_helsing');

  if (!draculaId || !vanHelsingId) return gs;

  const draculaRack = gs.players[draculaId].rack;
  const vanHelsingRack = gs.players[vanHelsingId].rack;

  const newDistricts = [...gs.districts];
  let newHP = gs.draculaHP;

  for (let i = 0; i < DISTRICTS; i++) {
    const draculaCard = draculaRack[i];
    const vanHelsingCard = vanHelsingRack[i];

    if (!draculaCard || !vanHelsingCard) continue;

    const result = compareCards(gs, draculaCard, vanHelsingCard);

    if (result > 0) {
      if (newDistricts[i].humans > 0) {
        newDistricts[i] = {
          humans: newDistricts[i].humans - 1,
          vampires: newDistricts[i].vampires + 1,
        };
      }
    } else if (result < 0) {
      newHP = Math.max(0, newHP - 1);
    }

    if (newDistricts[i].vampires >= HUMANS_PER_DISTRICT) {
      return {
        ...gs,
        districts: newDistricts,
        draculaHP: newHP,
        phase: 'game_over',
        winner: 'dracula',
        winnerReason: '모든 인간을 흡혈귀로 변환!',
      };
    }

    if (newHP <= 0) {
      return {
        ...gs,
        districts: newDistricts,
        draculaHP: 0,
        phase: 'game_over',
        winner: 'van_helsing',
        winnerReason: '드라큘라 처치!',
      };
    }
  }

  return {
    ...gs,
    districts: newDistricts,
    draculaHP: newHP,
  };
}

export function canEndRound(gs: DraculaGameState): boolean {
  return gs.discardPile.length >= 6;
}

export function startNewRound(gs: DraculaGameState): DraculaGameState {
  if (gs.round >= gs.maxRounds) {
    return {
      ...gs,
      phase: 'game_over',
      winner: 'dracula',
      winnerReason: '5 라운드 생존!',
    };
  }

  const deck = shuffleArray(createDeck());
  const playerIds = Object.keys(gs.players);

  const newPlayers: Record<string, DraculaPlayerState> = {};
  for (const id of playerIds) {
    const rack: (DraculaCard | null)[] = [];
    for (let i = 0; i < 5; i++) {
      rack.push(deck.pop() || null);
    }
    newPlayers[id] = {
      ...gs.players[id],
      rack,
      revealedCards: [],
      drawnCard: undefined,
      revealedDeckCard: undefined,
    };
  }

  return {
    ...gs,
    round: gs.round + 1,
    phase: 'playing',
    deck,
    discardPile: [],
    players: newPlayers,
    // 가정: 라운드마다 선 플레이어를 번갈아 맡는다 (홀수 라운드 드라큘라, 짝수 라운드 반헬싱)
    currentPlayer: (gs.round + 1) % 2 === 1 ? 'dracula' : 'van_helsing',
    step: 'draw',
    pendingAbility: null,
    lastAction: `라운드 ${gs.round + 1} 시작`,
  };
}
