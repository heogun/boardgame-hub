// 공용(게임 무관) 타입과 네트워크 프로토콜만 둔다.
// 게임별 타입은 src/games/<id>/types.ts 에 둔다.

import type { GameOptions } from '../framework/types';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export type GameStatus = 'LOBBY' | 'PLAYING';

/** 대기실(방) 상태. 방장이 소유하고 STATE_SYNC 로 모두에게 보낸다. */
export interface GameState {
  status: GameStatus;
  selectedGame: string;
  gameOptions: GameOptions;
  players: Player[];
}

export interface NetworkPayload {
  type: string;
  [key: string]: unknown;
}

// ---------- 대기실 ----------

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

export interface EventChatPayload extends NetworkPayload {
  type: 'EVENT_CHAT';
  senderName: string;
  message: string;
}

// ---------- 게임 세션 (모든 게임 공통) ----------

/** 클라이언트 → 방장: 게임 액션. 액션 내용은 게임이 정의한다. */
export interface GameActionPayload extends NetworkPayload {
  type: 'GAME_ACTION';
  sessionId: string;
  action: unknown;
}

/** 방장 → 클라이언트: 수신자 기준으로 걸러진(view) 게임 상태. */
export interface GameStatePayload extends NetworkPayload {
  type: 'GAME_STATE';
  sessionId: string;
  gameId: string;
  players: { id: string; name: string }[];
  state: unknown;
}

/** 방장 → 클라이언트: 게임 종료, 대기실로 복귀. */
export interface GameEndPayload extends NetworkPayload {
  type: 'GAME_END';
  sessionId: string;
  reason: string;
}

/** 방장 → 특정 클라이언트: 액션 거부 사유. */
export interface GameErrorPayload extends NetworkPayload {
  type: 'GAME_ERROR';
  message: string;
}

export type HostBoundPayload = ActionJoinPayload | ActionChatPayload | GameActionPayload;
export type ClientBoundPayload = StateSyncPayload | EventChatPayload | GameStatePayload | GameEndPayload | GameErrorPayload;
export type AnyPayload = HostBoundPayload | ClientBoundPayload;
