import type { Level10GameState, Level10PlayerHand } from './types';

const TOTAL_CARDS = 100;

export function getMaxLevel(playerCount: number): number {
  if (playerCount <= 2) return 12;
  if (playerCount === 3) return 10;
  return 8;
}

export function getInitialLives(playerCount: number): number {
  if (playerCount <= 2) return 2;
  if (playerCount === 3) return 3;
  return 4;
}

export function getInitialStars(): number {
  return 1;
}

export function getMaxLives(): number {
  return 5;
}

export function getMaxStars(): number {
  return 3;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createInitialGameState(playerIds: string[], playerCount: number): Level10GameState {
  const maxLevel = getMaxLevel(playerCount);
  const lives = getInitialLives(playerCount);
  const deck = shuffleArray(Array.from({ length: TOTAL_CARDS }, (_, i) => i + 1));
  const hands = dealHands(deck, 1, playerIds);

  return {
    currentLevel: 1,
    maxLevel,
    lives,
    maxLives: getMaxLives(),
    throwingStars: getInitialStars(),
    maxThrowingStars: getMaxStars(),
    phase: 'concentration',
    players: hands,
    centerPile: [],
    errorCard: null,
    lastPlayedValue: 0,
    blindMode: false,
    starVote: null,
  };
}

function dealHands(deck: number[], level: number, playerIds: string[]): Level10PlayerHand[] {
  let idx = 0;
  return playerIds.map((playerId) => {
    const cards: number[] = [];
    for (let i = 0; i < level; i++) {
      if (idx < deck.length) {
        cards.push(deck[idx++]);
      }
    }
    cards.sort((a, b) => a - b);
    return { playerId, cards };
  });
}

export function getMyHand(gs: Level10GameState, myId: string): number[] {
  const hand = gs.players.find((h) => h.playerId === myId);
  return hand ? hand.cards : [];
}

export function prepareNextLevel(gs: Level10GameState, playerIds: string[]): Level10GameState {
  const nextLevel = gs.currentLevel + 1;
  if (nextLevel > gs.maxLevel) {
    return { ...gs, phase: 'game_over_victory' };
  }
  const deck = shuffleArray(Array.from({ length: TOTAL_CARDS }, (_, i) => i + 1));
  const hands = dealHands(deck, nextLevel, playerIds);
  return {
    ...gs,
    currentLevel: nextLevel,
    players: hands,
    centerPile: [],
    errorCard: null,
    lastPlayedValue: 0,
    phase: 'concentration',
  };
}

export function applyRewards(gs: Level10GameState): Level10GameState {
  const rewardLevels: Record<number, Partial<Pick<Level10GameState, 'lives' | 'throwingStars'>>> = {
    2: { throwingStars: Math.min(gs.throwingStars + 1, gs.maxThrowingStars) },
    3: { lives: Math.min(gs.lives + 1, gs.maxLives) },
    5: { throwingStars: Math.min(gs.throwingStars + 1, gs.maxThrowingStars) },
    6: { lives: Math.min(gs.lives + 1, gs.maxLives) },
    8: { throwingStars: Math.min(gs.throwingStars + 1, gs.maxThrowingStars) },
    9: { lives: Math.min(gs.lives + 1, gs.maxLives) },
  };
  const reward = rewardLevels[gs.currentLevel];
  if (reward) {
    return { ...gs, ...reward };
  }
  return gs;
}

export function playCard(gs: Level10GameState, playerId: string, cardValue: number): { gs: Level10GameState; valid: boolean } {
  const hand = gs.players.find((h) => h.playerId === playerId);
  if (!hand) return { gs, valid: false };

  const idx = hand.cards.indexOf(cardValue);
  if (idx === -1) return { gs, valid: false };

  if (cardValue !== hand.cards[0]) return { gs, valid: false };

  const isCorrect = cardValue > gs.lastPlayedValue;

  if (isCorrect) {
    hand.cards.splice(idx, 1);
    const newCenter = [...gs.centerPile, cardValue];
    const newPlayers = gs.players.map((h) => (h.playerId === playerId ? { ...h, cards: [...h.cards] } : h));
    const newGs: Level10GameState = {
      ...gs,
      players: newPlayers,
      centerPile: newCenter,
      lastPlayedValue: cardValue,
    };

    const cardsRemaining = newGs.players.reduce((sum, h) => sum + h.cards.length, 0);
    if (cardsRemaining === 0) {
      return { gs: applyRewards({ ...newGs, phase: 'level_complete' }), valid: true };
    }

    return { gs: newGs, valid: true };
  } else {
    const lowerCards: number[] = [];
    gs.players.forEach((h) => {
      h.cards.forEach((c) => {
        if (c < cardValue) {
          lowerCards.push(c);
        }
      });
    });

    const newLives = gs.lives - 1;
    if (newLives <= 0) {
      return { gs: { ...gs, lives: 0, phase: 'game_over_defeat', errorCard: cardValue }, valid: false };
    }

    gs.players.forEach((h) => {
      h.cards = h.cards.filter((c) => c >= cardValue);
    });
    const newPlayers = gs.players.map((h) => ({ ...h, cards: [...h.cards] }));

    return {
      gs: {
        ...gs,
        lives: newLives,
        players: newPlayers,
        errorCard: cardValue,
        phase: 'error_pause',
      },
      valid: false,
    };
  }
}

export function useThrowingStar(gs: Level10GameState): Level10GameState {
  if (gs.throwingStars <= 0) return gs;
  const newPlayers = gs.players.map((h) => {
    if (h.cards.length === 0) return h;
    const newCards = [...h.cards];
    newCards.shift();
    return { ...h, cards: newCards };
  });
  const newGs: Level10GameState = {
    ...gs,
    throwingStars: gs.throwingStars - 1,
    players: newPlayers,
    starVote: null,
    phase: 'concentration',
  };

  const cardsRemaining = newGs.players.reduce((sum, h) => sum + h.cards.length, 0);
  if (cardsRemaining === 0) {
    return applyRewards({ ...newGs, phase: 'level_complete' });
  }
  return newGs;
}
