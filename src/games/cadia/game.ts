import type { CardiaGameState, CardiaCard, CardiaDeckType, CardiaLocation } from '../../types';

const DECK_I: CardiaCard[] = [
  { influence: 1, name: 'Hired Blade', ability: 'Discard both this card and the opposing card', abilityType: 'instant', faction: 'rebellion' },
  { influence: 2, name: 'Void Mage', ability: 'Remove all Modifiers or all Ongoing tokens from any one card', abilityType: 'instant', faction: 'academy' },
  { influence: 3, name: 'Surgeon', ability: 'Add -5 influence to the next card you play', abilityType: 'instant', faction: 'guild' },
  { influence: 4, name: 'Mediator', ability: 'This encounter is a tie', abilityType: 'ongoing', faction: 'dynasty' },
  { influence: 5, name: 'Saboteur', ability: 'Your opponent discards the top 2 cards of their deck', abilityType: 'instant', faction: 'rebellion' },
  { influence: 6, name: 'Fortune Teller', ability: 'In the next Encounter, your opponent plays their card face up before you play your card', abilityType: 'instant', faction: 'academy' },
  { influence: 7, name: 'Palace Guard', ability: 'Your opponent discards a card of your choice from their hand', abilityType: 'instant', faction: 'dynasty' },
  { influence: 8, name: 'Judge', ability: 'You win all tied encounters, including upcoming ones', abilityType: 'ongoing', faction: 'academy' },
  { influence: 9, name: 'Ambusher', ability: 'Choose a faction. Your opponent discards all cards of the chosen faction from their hand', abilityType: 'instant', faction: 'rebellion' },
  { influence: 10, name: 'Puppeteer', ability: 'Discard the opposing card. Replace it with a card you randomly draw from your opponent\'s hand', abilityType: 'instant', faction: 'guild' },
  { influence: 11, name: 'Clockmaker', ability: 'Add +3 influence to your card in the previous encounter as well as to the next card you play', abilityType: 'instant', faction: 'guild' },
  { influence: 12, name: 'Revolutionary', ability: 'Your opponent discards 1 card from their hand', abilityType: 'instant', faction: 'rebellion' },
  { influence: 13, name: 'Swamp Guardian', ability: 'At the end of the round, draw 1 extra card', abilityType: 'ongoing', faction: 'rebellion' },
  { influence: 14, name: 'Treasurer', ability: 'Place an additional signet on the card', abilityType: 'ongoing', faction: 'dynasty' },
  { influence: 15, name: 'Inventor', ability: 'Add +3 influence to any one card and -3 influence to any other card', abilityType: 'instant', faction: 'guild' },
  { influence: 16, name: 'Djinn', ability: 'You immediately win the game', abilityType: 'instant', faction: 'dynasty' },
];

const DECK_II: CardiaCard[] = [
  { influence: 1, name: 'Aristocrat', ability: 'Gain 1 additional signet if you win this encounter', abilityType: 'instant', faction: 'dynasty' },
  { influence: 2, name: 'Librarian', ability: 'Draw 2 cards from your deck', abilityType: 'instant', faction: 'academy' },
  { influence: 3, name: 'Elemental', ability: 'Change the faction of any one card to any faction', abilityType: 'instant', faction: 'rebellion' },
  { influence: 4, name: 'Successor', ability: 'Take the signet from the previous encounter if you win this one', abilityType: 'instant', faction: 'dynasty' },
  { influence: 5, name: 'Tax Collector', ability: 'Your opponent loses 1 signet if they have any', abilityType: 'instant', faction: 'dynasty' },
  { influence: 6, name: 'Poisoner', ability: 'Add -3 influence to the opposing card', abilityType: 'instant', faction: 'guild' },
  { influence: 7, name: 'Engineer', ability: 'Add +3 influence to any one card', abilityType: 'instant', faction: 'guild' },
  { influence: 8, name: 'Counselor', ability: 'You win the previous encounter even if it is a tie', abilityType: 'instant', faction: 'academy' },
  { influence: 9, name: 'Blackmailer', ability: 'Your opponent discards 2 cards from their hand', abilityType: 'instant', faction: 'rebellion' },
  { influence: 10, name: 'Envoy', ability: 'Add +5 influence to any one card', abilityType: 'instant', faction: 'dynasty' },
  { influence: 11, name: 'Clockmaker', ability: 'Add +3 influence to your card in the previous encounter as well as to the next card you play', abilityType: 'instant', faction: 'guild' },
  { influence: 12, name: 'Illusionist', ability: 'Copy and activate one of your opponent\'s played card\'s ability', abilityType: 'instant', faction: 'academy' },
  { influence: 13, name: 'Kinesis Mage', ability: 'Move all modifiers and ongoing tokens from one card to another', abilityType: 'instant', faction: 'rebellion' },
  { influence: 14, name: 'Prodigy', ability: 'Add +5 influence to the Prodigy', abilityType: 'instant', faction: 'academy' },
  { influence: 15, name: 'Magistra', ability: 'Copy and activate one of your own played card\'s ability', abilityType: 'instant', faction: 'academy' },
  { influence: 16, name: 'Mechanical Djinn', ability: 'You immediately win the game', abilityType: 'instant', faction: 'guild' },
];

export const LOCATIONS: CardiaLocation[] = [
  { id: 'serpent-temple', name: 'Serpent Temple', stars: 1, ability: 'Whenever you win an encounter, draw 1 card and your opponent discards 1 card' },
  { id: 'bazaar', name: 'Bazaar', stars: 1, ability: 'At the end of each round, do not draw cards. Whenever you have 1 card or fewer in hand, immediately draw 4 cards' },
  { id: 'founders-day', name: "Founder's Day", stars: 1, ability: 'If you ever win 3 successive encounters, you immediately win the game' },
  { id: 'grand-library', name: 'Grand Library', stars: 2, ability: 'At the beginning of the game, draw 2 cards instead of 5. At the end of each round, draw 2 cards instead of 1' },
  { id: 'scrapyard', name: 'Scrapyard', stars: 2, ability: 'At the end of each round, draw 2 cards instead of 1. Then place 1 card from your hand under your deck' },
  { id: 'auction-house', name: 'Auction House', stars: 2, ability: 'Whenever you reveal a card that has less Influence than your card in the previous encounter, discard the top card of your deck' },
  { id: 'haunted-catacombs', name: 'Haunted Catacombs', stars: 3, ability: 'If you reveal a card of the same faction as your card in the previous encounter, you immediately lose the game' },
  { id: 'foggy-swamp', name: 'Foggy Swamp', stars: 3, ability: 'Do not reveal your cards in encounters after placing them. Instead, reveal and resolve the top pair first, then the next, and so on' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createInitialGameState(
  player1Id: string,
  player2Id: string,
  deckType: CardiaDeckType = 'deck1',
  location: CardiaLocation | null = null,
): CardiaGameState {
  const handSize = location?.id === 'grand-library' ? 2 : 5;

  const deck1 = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const deck2 = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  const hand1 = deck1.splice(0, handSize);
  const hand2 = deck2.splice(0, handSize);

  return {
    phase: 'playing',
    deckType,
    location,
    encounters: [],
    signets: { [player1Id]: 0, [player2Id]: 0 },
    players: {
      [player1Id]: { hand: hand1, deck: deck1, discardPile: [] },
      [player2Id]: { hand: hand2, deck: deck2, discardPile: [] },
    },
    currentPlayer: player1Id,
    winner: null,
    winnerReason: '',
    round: 1,
    maxRounds: 16,
  };
}

export function getCard(influence: number, deckType: CardiaDeckType = 'deck1'): CardiaCard {
  const deck = deckType === 'deck2' ? DECK_II : DECK_I;
  return deck[influence - 1];
}

export function getEffectiveInfluence(
  gs: CardiaGameState,
  playerId: string,
  encounterIndex: number,
  cardIndex: number,
): number {
  const player = gs.players[playerId];
  if (!player) return 0;

  const card = getCard(cardIndex + 1);
  let influence = card.influence;

  const encounter = gs.encounters[encounterIndex];
  if (encounter) {
    const modifiers = playerId === gs.currentPlayer
      ? encounter.player1Modifiers
      : encounter.player2Modifiers;

    for (const mod of modifiers) {
      influence += mod.value;
    }
  }

  return influence;
}

export function checkWinner(gs: CardiaGameState): string | null {
  const playerIds = Object.keys(gs.players);

  for (const id of playerIds) {
    if ((gs.signets[id] || 0) >= 5) {
      return id;
    }
  }

  if (gs.encounters.length >= gs.maxRounds) {
    let maxSignets = -1;
    let winner: string | null = null;

    for (const id of playerIds) {
      const signets = gs.signets[id] || 0;
      if (signets > maxSignets) {
        maxSignets = signets;
        winner = id;
      } else if (signets === maxSignets) {
        winner = null;
      }
    }

    return winner;
  }

  return null;
}

export function resolveEncounter(
  gs: CardiaGameState,
  encounterIndex: number,
): CardiaGameState {
  const encounter = gs.encounters[encounterIndex];
  if (!encounter) return gs;

  const playerIds = Object.keys(gs.players);
  const player1Id = playerIds[0];
  const player2Id = playerIds[1];

  const p1Card = getCard(encounter.player1Card + 1);
  const p2Card = getCard(encounter.player2Card + 1);

  let p1Influence = p1Card.influence;
  let p2Influence = p2Card.influence;

  for (const mod of encounter.player1Modifiers) {
    p1Influence += mod.value;
  }
  for (const mod of encounter.player2Modifiers) {
    p2Influence += mod.value;
  }

  const newEncounters = [...gs.encounters];
  const newSignets = { ...gs.signets };

  if (p1Influence > p2Influence) {
    newSignets[player1Id] = (newSignets[player1Id] || 0) + 1;
    newEncounters[encounterIndex] = {
      ...encounter,
      player1Signet: true,
      player2Signet: false,
    };
  } else if (p2Influence > p1Influence) {
    newSignets[player2Id] = (newSignets[player2Id] || 0) + 1;
    newEncounters[encounterIndex] = {
      ...encounter,
      player1Signet: false,
      player2Signet: true,
    };
  } else {
    const judgeHasOngoing = encounter.ongoingTokens.includes('judge');
    if (judgeHasOngoing) {
      newSignets[player1Id] = (newSignets[player1Id] || 0) + 1;
      newEncounters[encounterIndex] = {
        ...encounter,
        player1Signet: true,
        player2Signet: false,
      };
    } else {
      newEncounters[encounterIndex] = {
        ...encounter,
        player1Signet: false,
        player2Signet: false,
      };
    }
  }

  return {
    ...gs,
    encounters: newEncounters,
    signets: newSignets,
  };
}
