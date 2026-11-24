export type CardSuit = 'red' | 'blue' | 'green' | 'yellow';

export interface DraculaCard {
  suit: CardSuit;
  value: number;
}

export type DraculaRole = 'dracula' | 'van_helsing';

export interface DraculaPlayerState {
  role: DraculaRole;
  rack: (DraculaCard | null)[];
  revealedCards: number[];
  drawnCard?: DraculaCard;
  revealedDeckCard?: DraculaCard;
}

export type DraculaPhase = 'setup' | 'playing' | 'round_end' | 'game_over';

export interface DistrictState {
  humans: number;
  vampires: number;
}

export interface DraculaGameState {
  round: number;
  maxRounds: number;
  phase: DraculaPhase;
  draculaHP: number;
  maxDraculaHP: number;
  districts: DistrictState[];
  colorRanking: CardSuit[];
  deck: DraculaCard[];
  discardPile: DraculaCard[];
  players: Record<string, DraculaPlayerState>;
  currentPlayer: DraculaRole;
  winner: DraculaRole | null;
  winnerReason: string;
}
