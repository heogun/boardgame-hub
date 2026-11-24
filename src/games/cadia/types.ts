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

/** 지속 토큰 (해당 카드가 놓여 있는 동안 효과가 유지된다) */
export type CardiaToken = 'mediator' | 'judge' | 'swamp' | 'treasurer' | 'aristocrat' | 'successor';

/** 조우에 놓인 카드 한 장 */
export interface CardiaPlayedCard {
  /** 카드 번호 0~15 (영향력 - 1) */
  card: number;
  modifiers: number[];
  tokens: CardiaToken[];
  /** 원소술사(Elemental)로 바뀔 수 있다 */
  faction: CardiaFaction;
  /** 이 카드에 놓인 인장 수 (recompute 가 매번 다시 계산) */
  signets: number;
}

export interface CardiaEncounter {
  /** 플레이어 id → 그 플레이어가 낸 카드 */
  cards: Record<string, CardiaPlayedCard>;
  /** 이긴 플레이어 (무승부면 null). recompute 가 다시 계산한다. */
  winner: string | null;
  /** 상담가(Counselor)가 강제로 정한 승자 */
  forcedWinner: string | null;
  /** 청부업자(Hired Blade)로 두 카드가 모두 버려졌다 → 인장 없음 */
  discarded: boolean;
}

/** 패배한 카드의 능력에 필요한 선택. 선택이 끝날 때까지 다음 조우로 넘어가지 않는다. */
export interface CardiaChoice {
  /** 선택할 플레이어 (혁명가·협박꾼은 상대가 고른다) */
  playerId: string;
  /** 능력을 쓴 플레이어 */
  owner: string;
  /** 능력 카드 이름 */
  ability: string;
  /** 능력이 발동한 조우 번호 */
  encIndex: number;
  /** 지금 고를 것 */
  kind: 'card' | 'faction' | 'hand' | 'option';
  /** 여러 단계 능력에서 앞서 고른 카드 */
  picks: { enc: number; side: string }[];
  /** 손패에서 버릴 남은 장수 */
  remaining: number;
  prompt: string;
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
  /** 플레이어별 인장 합계 (recompute 가 계산) */
  signets: Record<string, number>;
  /** 세금 징수원(Tax Collector)으로 잃은 인장 수 */
  signetPenalty: Record<string, number>;
  players: Record<string, CardiaPlayerState>;
  winner: string | null;
  winnerReason: string;
  maxRounds: number;
  /** 이번 조우에 각 플레이어가 낸 카드 번호(0~15). 둘 다 내면 동시에 공개된다. */
  pending: Record<string, number>;
  /** 다음에 내는 카드에 붙을 수정치 (외과의·시계공) */
  nextModifiers: Record<string, number[]>;
  /** 점쟁이(Fortune Teller): 이 플레이어가 먼저 앞면으로 카드를 낸다 */
  playsFirst: string | null;
  /** 폐차장(Scrapyard): 손패 한 장을 덱 밑에 넣어야 하는 플레이어 */
  pendingBottom: string[];
  choice: CardiaChoice | null;
  log: string[];
}
