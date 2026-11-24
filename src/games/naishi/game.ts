import type { NaishiGameState, NaishiPlayerState, NaishiCard, NaishiCardType } from './types';

const CARD_TYPES: NaishiCardType[] = [
  'mountain', 'naishi', 'advisor', 'fort', 'sentinel',
  'torii', 'monk', 'rice_field', 'banner', 'horseman', 'ronin', 'ninja',
];

const CARDS_PER_TYPE = 4;
const RIVER_PILES = 5;
const CARDS_PER_PILE = 6;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDeck(): NaishiCard[] {
  const deck: NaishiCard[] = [];
  let id = 0;
  for (const type of CARD_TYPES) {
    for (let i = 0; i < CARDS_PER_TYPE; i++) {
      deck.push({ type, id: id++ });
    }
  }
  return shuffleArray(deck);
}

function createMountainCards(): NaishiCard[] {
  const mountains: NaishiCard[] = [];
  for (let i = 0; i < 8; i++) {
    mountains.push({ type: 'mountain', id: 100 + i });
  }
  return mountains;
}

export function createInitialGameState(player1Id: string, player2Id: string): NaishiGameState {
  const deck = createDeck();
  const mountains = createMountainCards();

  const river: (NaishiCard | null)[] = [];
  const riverSizes: number[] = [];

  for (let i = 0; i < RIVER_PILES; i++) {
    const pile: NaishiCard[] = [];
    for (let j = 0; j < CARDS_PER_PILE; j++) {
      if (deck.length > 0) {
        pile.push(deck.pop()!);
      }
    }
    river.push(pile[0] || null);
    riverSizes.push(pile.length);
  }

  const createPlayerState = (): NaishiPlayerState => {
    const line: (NaishiCard | null)[] = [];
    const hand: (NaishiCard | null)[] = [];

    for (let i = 0; i < 5; i++) {
      if (mountains.length > 0) {
        line.push(mountains.pop()!);
      } else if (deck.length > 0) {
        line.push(deck.pop()!);
      } else {
        line.push(null);
      }
    }

    for (let i = 0; i < 5; i++) {
      if (deck.length > 0) {
        hand.push(deck.pop()!);
      } else {
        hand.push(null);
      }
    }

    return {
      line,
      hand,
      emissaryTokens: 2,
      usedImperialDecree: false,
    };
  };

  return {
    phase: 'playing',
    river,
    riverSizes,
    discardPile: [],
    players: {
      [player1Id]: createPlayerState(),
      [player2Id]: createPlayerState(),
    },
    currentPlayer: player1Id,
    winner: null,
    winnerReason: '',
  };
}

export function canDeclareEnd(gs: NaishiGameState): boolean {
  return gs.riverSizes.some((size) => size <= 1);
}

export function declareEnd(gs: NaishiGameState): NaishiGameState {
  return { ...gs, phase: 'game_over' };
}

export function countUniqueTypes(cards: (NaishiCard | null)[]): number {
  const types = new Set<NaishiCardType>();
  for (const card of cards) {
    if (card && card.type !== 'ninja' && card.type !== 'mountain') {
      types.add(card.type);
    }
  }
  return types.size;
}

export function calculateScore(gs: NaishiGameState, playerId: string): number {
  const player = gs.players[playerId];
  if (!player) return 0;

  let score = 0;

  const lineTypes = player.line.map((c) => c?.type || null);
  const handTypes = player.hand.map((c) => c?.type || null);

  for (let i = 0; i < 5; i++) {
    const lineCard = player.line[i];
    const handCard = player.hand[i];

    if (lineCard) {
      score += calculateCardScore(lineCard.type, 'line', i, lineTypes, handTypes);
    }
    if (handCard) {
      score += calculateCardScore(handCard.type, 'hand', i, lineTypes, handTypes);
    }
  }

  return score;
}

function calculateCardScore(
  type: NaishiCardType,
  zone: 'line' | 'hand',
  position: number,
  lineTypes: (NaishiCardType | null)[],
  handTypes: (NaishiCardType | null)[],
): number {
  switch (type) {
    case 'mountain': {
      const count = lineTypes.filter((t) => t === 'mountain').length +
        handTypes.filter((t) => t === 'mountain').length;
      return count === 1 ? 5 : -5;
    }

    case 'naishi':
      if (position === 2) {
        return zone === 'line' ? 12 : 8;
      }
      return 0;

    case 'advisor': {
      let base;
      if (position === 0 || position === 4) base = 2;
      else if (position === 1 || position === 3) base = 4;
      else base = 3;

      let adjacentNaishi = 0;
      if (position > 0 && lineTypes[position - 1] === 'naishi') adjacentNaishi++;
      if (position < 4 && lineTypes[position + 1] === 'naishi') adjacentNaishi++;
      if (handTypes[position] === 'naishi') adjacentNaishi++;

      return base + adjacentNaishi * 4;
    }

    case 'fort':
      return (position === 0 || position === 4) ? 6 : 0;

    case 'sentinel': {
      let adjacentSentinel = false;
      if (position > 0 && lineTypes[position - 1] === 'sentinel') adjacentSentinel = true;
      if (position < 4 && lineTypes[position + 1] === 'sentinel') adjacentSentinel = true;

      let adjacentFort = 0;
      if (position > 0 && lineTypes[position - 1] === 'fort') adjacentFort++;
      if (position < 4 && lineTypes[position + 1] === 'fort') adjacentFort++;

      return (adjacentSentinel ? 0 : 3) + adjacentFort * 4;
    }

    case 'torii': {
      const count = lineTypes.filter((t) => t === 'torii').length +
        handTypes.filter((t) => t === 'torii').length;
      if (count === 1) return -5;
      if (count === 2) return 0;
      return 30;
    }

    case 'monk': {
      const base = zone === 'hand' ? 5 : 0;
      let adjacentTorii = 0;
      if (position > 0 && lineTypes[position - 1] === 'torii') adjacentTorii++;
      if (position < 4 && lineTypes[position + 1] === 'torii') adjacentTorii++;
      return base + adjacentTorii * 2;
    }

    case 'rice_field': {
      let groupSize = 1;
      for (let i = position - 1; i >= 0; i--) {
        if (lineTypes[i] === 'rice_field') groupSize++;
        else break;
      }
      for (let i = position + 1; i < 5; i++) {
        if (lineTypes[i] === 'rice_field') groupSize++;
        else break;
      }
      if (groupSize >= 4) return 30;
      if (groupSize === 3) return 20;
      if (groupSize === 2) return 10;
      return 0;
    }

    case 'banner': {
      const count = lineTypes.filter((t) => t === 'banner').length;
      return count === 1 ? 3 : count >= 2 ? 8 : 0;
    }

    case 'horseman': {
      let base = zone === 'hand' ? 3 : 0;
      if (lineTypes[position] === 'banner') base += 10;
      return base;
    }

    case 'ronin': {
      const uniqueTypes = countUniqueTypes([...lineTypes.map((t) => t ? { type: t } as NaishiCard : null),
        ...handTypes.map((t) => t ? { type: t } as NaishiCard : null)]);
      if (uniqueTypes >= 10) return 45;
      if (uniqueTypes === 9) return 15;
      if (uniqueTypes === 8) return 8;
      return 0;
    }

    case 'ninja':
      return 0;

    default:
      return 0;
  }
}
