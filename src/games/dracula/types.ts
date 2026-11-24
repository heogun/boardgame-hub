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

/**
 * 한 턴의 단계.
 *  draw    : 카드를 뽑는다 (또는 조건이 되면 라운드 종료)
 *  place   : 뽑은 카드를 버리거나 내 랙의 카드와 바꾼다 (바뀐 카드는 버려진다)
 *  ability : 방금 버린 카드 색의 능력을 쓰거나 건너뛴다 → 상대 턴
 */
export type DraculaTurnStep = 'draw' | 'place' | 'ability';

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
  step: DraculaTurnStep;
  /** step === 'ability' 일 때 쓸 수 있는 능력 (버린 카드의 색) */
  pendingAbility: CardSuit | null;
  /** 직전 행동 설명 (양쪽 화면에 표시) */
  lastAction: string;
  winner: DraculaRole | null;
  winnerReason: string;
}
