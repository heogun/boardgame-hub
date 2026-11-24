export type CardiaFaction = 'rebellion' | 'academy' | 'guild' | 'dynasty';

export type CardiaAbilityType = 'instant' | 'ongoing';

export type CardiaDeckType = 'deck1' | 'deck2';

export interface CardiaCard {
  influence: number;
  name: string;
  ability: string;
  abilityType: CardiaAbilityType;
  faction: CardiaFaction;
}

export interface CardiaLocation {
  id: string;
  name: string;
  stars: number;
  ability: string;
}

export interface CardiaModifier {
  value: number;
}

export interface CardiaEncounter {
  player1Card: number;
  player2Card: number;
  player1Signet: boolean;
  player2Signet: boolean;
  player1Modifiers: CardiaModifier[];
  player2Modifiers: CardiaModifier[];
  ongoingTokens: string[];
}

export type CardiaPhase = 'setup' | 'playing' | 'game_over';

export interface CardiaPlayerState {
  hand: number[];
  deck: number[];
  discardPile: number[];
}

export interface CardiaGameState {
  phase: CardiaPhase;
  deckType: CardiaDeckType;
  location: CardiaLocation | null;
  encounters: CardiaEncounter[];
  signets: Record<string, number>;
  players: Record<string, CardiaPlayerState>;
  currentPlayer: string;
  winner: string | null;
  winnerReason: string;
  round: number;
  maxRounds: number;
  /** 이번 조우에 각 플레이어가 낸 카드 번호(0~15). 둘 다 내면 동시에 공개된다. */
  pending: Record<string, number>;
}
