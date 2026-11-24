export type CosmoSuit = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface CosmoCard {
  suit: CosmoSuit;
  rank: number;
}

export type CosmoHandRank =
  | 'high_card'
  | 'one_pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush';

export interface CosmoHandResult {
  rank: CosmoHandRank;
  cards: CosmoCard[];
  score: number;
}

export type CosmoPhase = 'setup' | 'drawing' | 'betting' | 'showdown' | 'game_over';

export type CosmoBetTarget = 'self' | 'opponent';

export interface CosmoBet {
  playerId: string;
  amount: number;
  target: CosmoBetTarget;
  targetPlayerId?: string;
}

export interface CosmoPlayerState {
  hand: CosmoCard[];
  visibleCards: CosmoCard[];
  hiddenCards: CosmoCard[];
  money: number;
  bet: CosmoBet | null;
  hasBet: boolean;
}

export interface CosmoGameState {
  phase: CosmoPhase;
  players: Record<string, CosmoPlayerState>;
  decks: CosmoCard[][];
  currentTurn: string;
  round: number;
  maxRounds: number;
  pot: number;
  winner: string | null;
  winnerReason: string;
  playerOrder: string[];
}
