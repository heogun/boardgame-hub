export type BuffaloPieceType = 'buffalo' | 'dog' | 'chief';

export interface BuffaloPiece {
  type: BuffaloPieceType;
  row: number;
  col: number;
}

export type BuffaloTurn = 'buffalo' | 'chief';

export interface BuffaloGameState {
  /** 역할별 플레이어 id */
  roles: Record<BuffaloTurn, string>;
  pieces: BuffaloPiece[];
  currentTurn: BuffaloTurn;
  phase: 'playing' | 'game_over';
  winner: BuffaloTurn | null;
  winnerReason: string;
}
