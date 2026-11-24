export type NaishiCardType = 'mountain' | 'naishi' | 'advisor' | 'fort' | 'sentinel' | 'torii' | 'monk' | 'rice_field' | 'banner' | 'horseman' | 'ronin' | 'ninja';

export interface NaishiCard {
  type: NaishiCardType;
  id: number;
}

export type NaishiPhase = 'setup' | 'playing' | 'game_over';

export interface NaishiPlayerState {
  line: (NaishiCard | null)[];
  hand: (NaishiCard | null)[];
  /** 손에 남은(쓸 수 있는) 사절 수. 칙령 칸에 놓인 사절은 돌아오지 않는다. */
  emissaryTokens: number;
  usedImperialDecree: boolean;
}

export type NaishiZone = 'line' | 'hand';

export interface NaishiGameState {
  phase: NaishiPhase;
  /** 강의 공개된 카드 (각 더미의 맨 위) */
  river: (NaishiCard | null)[];
  /** 각 더미에 남은 카드 수 (공개된 카드 포함) */
  riverSizes: number[];
  /** 각 더미의 실제 카드 (0번이 맨 위). view 에서 비워서 보낸다. */
  riverPiles: NaishiCard[][];
  discardPile: NaishiCard[];
  players: Record<string, NaishiPlayerState>;
  currentPlayer: string;
  /** 선 플레이어 (게임 종료 시 마지막 턴 판정용) */
  firstPlayer: string;
  /** 이번 턴에 주 행동(개발·회수·선언)을 했는지 */
  mainDone: boolean;
  /** 이번 턴에 사절 보너스 행동을 이미 했는지 */
  bonusUsed: boolean;
  /** 황제 칙령은 게임 전체에서 한 번만 (칸이 하나) */
  decreeUsedBy: string | null;
  /** 종료가 확정되어 이 플레이어의 턴이 끝나면 점수 계산 */
  finalTurnOf: string | null;
  lastAction: string;
  winner: string | null;
  winnerReason: string;
}
