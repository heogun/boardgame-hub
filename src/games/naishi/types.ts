export type NaishiCardType = 'mountain' | 'naishi' | 'advisor' | 'fort' | 'sentinel' | 'torii' | 'monk' | 'rice_field' | 'banner' | 'horseman' | 'ronin' | 'ninja';

export interface NaishiCard {
  type: NaishiCardType;
  id: number;
}

export type NaishiPhase = 'setup' | 'playing' | 'game_over';

export interface NaishiPlayerState {
  line: (NaishiCard | null)[];
  hand: (NaishiCard | null)[];
  emissaryTokens: number;
  usedImperialDecree: boolean;
}

export interface NaishiGameState {
  phase: NaishiPhase;
  river: (NaishiCard | null)[];
  riverSizes: number[];
  discardPile: NaishiCard[];
  players: Record<string, NaishiPlayerState>;
  currentPlayer: string;
  winner: string | null;
  winnerReason: string;
}
