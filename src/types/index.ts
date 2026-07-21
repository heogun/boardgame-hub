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

export type AnyPayload =
  | StateSyncPayload
  | ActionJoinPayload
  | ActionChatPayload
  | ActionSelectGamePayload
  | EventChatPayload;

export interface GameModule {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  icon: string;
}
