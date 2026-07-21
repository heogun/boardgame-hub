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

export type AnyPayload = StateSyncPayload | ActionJoinPayload | ActionChatPayload | ActionSelectGamePayload | EventChatPayload | L10AnyPayload;
