export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export type GameStatus = 'LOBBY' | 'PLAYING';

export interface GameState {
  status: GameStatus;
  selectedGame: string;
  players: Player[];
}

export type PeerRole = 'HOST' | 'CLIENT';

export interface NetworkPayload {
  type: string;
  [key: string]: unknown;
}

export interface StateSyncPayload extends NetworkPayload {
  type: 'STATE_SYNC';
  state: GameState;
}

export interface ActionJoinPayload extends NetworkPayload {
  type: 'ACTION_JOIN';
  name: string;
}

export interface ActionChatPayload extends NetworkPayload {
  type: 'ACTION_CHAT';
  message: string;
}

export interface ActionSelectGamePayload extends NetworkPayload {
  type: 'ACTION_SELECT_GAME';
  game: string;
}

export interface EventChatPayload extends NetworkPayload {
  type: 'EVENT_CHAT';
  senderName: string;
  message: string;
}

export interface GameModule {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  icon: string;
}

// ========== Level 10 specific types ==========

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
}

// ========== Buffalo Chess specific types ==========

export type BuffaloPieceType = 'buffalo' | 'dog' | 'chief';

export interface BuffaloPiece {
  type: BuffaloPieceType;
  row: number;
  col: number;
}

export type BuffaloTurn = 'buffalo' | 'chief';

export interface BuffaloGameState {
  pieces: BuffaloPiece[];
  currentTurn: BuffaloTurn;
  phase: 'playing' | 'game_over';
  winner: BuffaloTurn | null;
  winnerReason: string;
}

// Network messages for Buffalo Chess
export interface BCActionMove extends NetworkPayload {
  type: 'BC_MOVE';
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

export interface BCStateSync extends NetworkPayload {
  type: 'BC_STATE_SYNC';
  gs: BuffaloGameState;
}

export interface BCActionReturnToLobby extends NetworkPayload {
  type: 'BC_RETURN_TO_LOBBY';
}

export type BCAnyPayload = BCActionMove | BCStateSync | BCActionReturnToLobby;

// ========== Dracula vs Van Helsing specific types ==========

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

// Network messages for Dracula vs Van Helsing
export interface DVHActionDrawCard extends NetworkPayload {
  type: 'DVH_DRAW_CARD';
}

export interface DVHActionDiscardCard extends NetworkPayload {
  type: 'DVH_DISCARD_CARD';
  card: DraculaCard;
  swapIndex?: number;
}

export interface DVHActionSwapCards extends NetworkPayload {
  type: 'DVH_SWAP_CARDS';
  index1: number;
  index2: number;
}

export interface DVHActionSwapWithOpponent extends NetworkPayload {
  type: 'DVH_SWAP_WITH_OPPONENT';
  myIndex: number;
}

export interface DVHActionSwapTrump extends NetworkPayload {
  type: 'DVH_SWAP_TRUMP';
  newTrump: CardSuit;
}

export interface DVHActionEndRound extends NetworkPayload {
  type: 'DVH_END_ROUND';
}

export interface DVHActionRevealCard extends NetworkPayload {
  type: 'DVH_REVEAL_CARD';
  target: 'self' | 'opponent' | 'deck';
  index?: number;
}

export interface DVHActionExtraTurn extends NetworkPayload {
  type: 'DVH_EXTRA_TURN';
}

export interface DVHStateSync extends NetworkPayload {
  type: 'DVH_STATE_SYNC';
  gs: DraculaGameState;
}

export interface DVHActionReturnToLobby extends NetworkPayload {
  type: 'DVH_RETURN_TO_LOBBY';
}

export type DVHAnyPayload =
  | DVHActionDrawCard
  | DVHActionDiscardCard
  | DVHActionSwapCards
  | DVHActionSwapWithOpponent
  | DVHActionSwapTrump
  | DVHActionEndRound
  | DVHActionRevealCard
  | DVHActionExtraTurn
  | DVHStateSync
  | DVHActionReturnToLobby;

// ========== Naishi specific types ==========

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

// Network messages for Naishi
export interface NSActionDevelop extends NetworkPayload {
  type: 'NS_DEVELOP';
  riverIndex: number;
  targetZone: 'line' | 'hand';
  targetIndex: number;
}

export interface NSActionSwapPositions extends NetworkPayload {
  type: 'NS_SWAP_POSITIONS';
  zone: 'line' | 'hand';
  index1: number;
  index2: number;
}

export interface NSActionRemoveFromRiver extends NetworkPayload {
  type: 'NS_REMOVE_FROM_RIVER';
  index1: number;
  index2: number;
}

export interface NSActionImperialDecree extends NetworkPayload {
  type: 'NS_IMPERIAL_DECREE';
  targetIndex: number;
}

export interface NSActionRecallEmissaries extends NetworkPayload {
  type: 'NS_RECALL_EMISSARIES';
}

export interface NSActionDeclareEnd extends NetworkPayload {
  type: 'NS_DECLARE_END';
}

export interface NSActionEndTurn extends NetworkPayload {
  type: 'NS_END_TURN';
}

export interface NSStateSync extends NetworkPayload {
  type: 'NS_STATE_SYNC';
  gs: NaishiGameState;
}

export interface NSActionReturnToLobby extends NetworkPayload {
  type: 'NS_RETURN_TO_LOBBY';
}

export type NSAnyPayload =
  | NSActionDevelop
  | NSActionSwapPositions
  | NSActionRemoveFromRiver
  | NSActionImperialDecree
  | NSActionRecallEmissaries
  | NSActionDeclareEnd
  | NSActionEndTurn
  | NSStateSync
  | NSActionReturnToLobby;

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
}

export interface CDActionPlayCard extends NetworkPayload {
  type: 'CD_PLAY_CARD';
  cardIndex: number;
}

export interface CDActionActivateAbility extends NetworkPayload {
  type: 'CD_ACTIVATE_ABILITY';
  encounterIndex: number;
}

export interface CDStateSync extends NetworkPayload {
  type: 'CD_STATE_SYNC';
  gs: CardiaGameState;
}

export interface CDActionReturnToLobby extends NetworkPayload {
  type: 'CD_RETURN_TO_LOBBY';
}

export type CDAnyPayload =
  | CDActionPlayCard
  | CDActionActivateAbility
  | CDStateSync
  | CDActionReturnToLobby;

// Network messages for Level 10
export interface L10ActionCardPlay extends NetworkPayload {
  type: 'L10_CARD_PLAY';
  value: number;
}

export interface L10ActionReady extends NetworkPayload {
  type: 'L10_READY';
}

export interface L10ActionPause extends NetworkPayload {
  type: 'L10_PAUSE';
}

export interface L10ActionResume extends NetworkPayload {
  type: 'L10_RESUME';
}

export interface L10ActionUseStar extends NetworkPayload {
  type: 'L10_USE_STAR';
  agree: boolean;
}

export interface L10StateSync extends NetworkPayload {
  type: 'L10_STATE_SYNC';
  gs: Level10GameState;
}

export interface L10ActionSuggestStar extends NetworkPayload {
  type: 'L10_SUGGEST_STAR';
  suggesterId: string;
}

export interface L10ActionStarVote extends NetworkPayload {
  type: 'L10_STAR_VOTE';
  agree: boolean;
}

export interface L10ActionError extends NetworkPayload {
  type: 'L10_ERROR';
  playedValue: number;
  lowerCards: number[];
}

export interface L10ActionReturnToLobby extends NetworkPayload {
  type: 'L10_RETURN_TO_LOBBY';
}

export type L10AnyPayload =
  | L10ActionCardPlay
  | L10ActionReady
  | L10ActionPause
  | L10ActionResume
  | L10ActionUseStar
  | L10StateSync
  | L10ActionSuggestStar
  | L10ActionStarVote
  | L10ActionError
  | L10ActionReturnToLobby;

export type AnyPayload = StateSyncPayload | ActionJoinPayload | ActionChatPayload | ActionSelectGamePayload | EventChatPayload | L10AnyPayload | BCAnyPayload | DVHAnyPayload | NSAnyPayload | CDAnyPayload;
