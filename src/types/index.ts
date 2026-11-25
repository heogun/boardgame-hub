// 공용(게임 무관) 타입과 네트워크 프로토콜만 둔다.
// 게임별 타입은 src/games/<id>/types.ts 에 둔다.

import type { GameOptions } from '../framework/types';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  /** false 면 연결이 끊겨 재접속을 기다리는 중 (게임 중에만 자리를 남겨 둔다) */
  connected?: boolean;
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
  /** 재접속할 때 처음 입장 때 받은 토큰. 같은 id 로 다른 사람이 자리를 가로채지 못하게 한다. */
  token?: string;
}

/** 클라이언트 → 방장: 스스로 방을 나간다 (재접속 대기 없이 바로 퇴장) */
export interface ActionLeavePayload extends NetworkPayload {
  type: 'ACTION_LEAVE';
}

/** 방장 → 입장한 클라이언트에게만: 재접속용 토큰 */
export interface JoinAcceptedPayload extends NetworkPayload {
  type: 'JOIN_ACCEPTED';
  token: string;
  /** true 면 끊겼던 자리로 돌아왔다 */
  rejoined: boolean;
}

/** 방장 → 클라이언트: 연결 확인. 클라이언트는 바로 PONG 으로 답한다. */
export interface PingPayload extends NetworkPayload {
  type: 'PING';
}

/** 클라이언트 → 방장: PING 응답 */
export interface PongPayload extends NetworkPayload {
  type: 'PONG';
}

/** 방장 → 모두: 방장이 방을 나가 방이 닫혔다 (재접속 시도하지 않음) */
export interface RoomClosedPayload extends NetworkPayload {
  type: 'ROOM_CLOSED';
}

/** 방장 → 클라이언트: 입장 거부 (토큰 불일치 등) */
export interface JoinRejectedPayload extends NetworkPayload {
  type: 'JOIN_REJECTED';
  reason: string;
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

export type HostBoundPayload = ActionJoinPayload | ActionLeavePayload | ActionChatPayload | GameActionPayload | PongPayload;
export type ClientBoundPayload =
  | StateSyncPayload
  | EventChatPayload
  | GameStatePayload
  | GameEndPayload
  | GameErrorPayload
  | JoinAcceptedPayload
  | JoinRejectedPayload
  | RoomClosedPayload
  | PingPayload;
export type AnyPayload = HostBoundPayload | ClientBoundPayload;
