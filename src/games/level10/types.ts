export interface Level10Card {
  value: number;
  ownerId: string;
}

export interface Level10PlayerHand {
  playerId: string;
  cards: number[];
}

export type Level10Phase = 'concentration' | 'playing' | 'error_pause' | 'level_complete' | 'game_over_victory' | 'game_over_defeat';

export interface Level10GameState {
  currentLevel: number;
  maxLevel: number;
  lives: number;
  maxLives: number;
  throwingStars: number;
  maxThrowingStars: number;
  phase: Level10Phase;
  players: Level10PlayerHand[];
  centerPile: number[];
  errorCard: number | null;
  lastPlayedValue: number;
  blindMode: boolean;
  /** 진행 중인 별(수리검) 사용 투표. 모든 참가자가 동의하면 사용된다. */
  starVote: { suggesterId: string; agreed: string[] } | null;
}
