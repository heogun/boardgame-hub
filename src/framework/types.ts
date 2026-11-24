/**
 * 보드게임 모듈 계약.
 *
 * 모든 게임은 이 인터페이스 하나만 구현하면 된다. 네트워크 전송, 화면 전환, 방장 권한,
 * 숨김 정보 필터링, 플레이어 이탈 처리, 대기실 복귀는 프레임워크(session.ts)가 맡는다.
 *
 * 실행 모델 — 방장 권위(host-authoritative):
 *  - 상태(S)는 방장만 갖는다. setup/reduce/tick 은 방장에서만 실행된다(무작위도 여기서만).
 *  - 플레이어는 액션(A)을 보낸다 → 방장이 reduce 로 검증·적용 → 각 플레이어에게 view 로 거른 상태를 보낸다.
 *  - render 는 순수하게 "받은 상태 + 로컬 UI 상태"를 그린다. 상태를 직접 바꾸지 말고 dispatch 하라.
 */

export interface PlayerInfo {
  id: string;
  name: string;
}

export interface GameOptionChoice {
  value: string;
  label: string;
  description?: string;
}

/** 방장이 게임 시작 전에 대기실에서 고르는 옵션(예: 덱 종류, 맵, 난이도). */
export interface GameOption {
  key: string;
  label: string;
  choices: GameOptionChoice[];
  default: string;
}

export type GameOptions = Record<string, string>;

export interface SetupContext {
  /** 참가 순서대로 정렬된 플레이어 (대기실 입장 순, 방장이 0번). */
  players: PlayerInfo[];
  options: GameOptions;
}

export interface ActionContext {
  /** 액션을 보낸 플레이어. 프레임워크가 연결 정보로 채우므로 위조할 수 없다. */
  playerId: string;
  players: PlayerInfo[];
  now: number;
}

export interface TickContext {
  players: PlayerInfo[];
  now: number;
}

export interface RenderContext<A, L> {
  myId: string;
  isHost: boolean;
  /** 이 게임의 참가자가 아닌 관전자(게임 도중 입장 등)인지 여부. */
  isSpectator: boolean;
  players: PlayerInfo[];
  playerName(id: string | null | undefined): string;
  /** 방장에게 액션을 보낸다 (방장 자신이면 바로 적용). */
  dispatch(action: A): void;
  /** 이 게임 세션 동안 유지되는 로컬 UI 상태 (선택한 카드 등). 다른 플레이어와 공유되지 않는다. */
  local: L;
  /** 로컬 UI 상태만 바뀌었을 때 다시 그린다. */
  rerender(): void;
}

/** 규칙 위반 액션. reduce 에서 던지면 해당 플레이어에게만 메시지가 표시되고 상태는 그대로다. */
export class IllegalAction extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalAction';
  }
}

export interface GameResult {
  /** 결과 요약 (예: "철수 승리", "무승부"). 게임 종료 배너에 표시된다. */
  summary: string;
}

// 메서드 문법으로 선언해 GameDefinition<구체 타입> 을 AnyGameDefinition 으로 넘길 수 있게 한다.
export interface GameDefinition<S, A, L = Record<string, never>> {
  id: string;
  name: string;
  description: string;
  /** Phosphor 아이콘 클래스 (예: 'ph-rocket'). */
  icon: string;
  minPlayers: number;
  maxPlayers: number;
  options?: GameOption[];

  /** 초기 상태를 만든다. (방장 전용) */
  setup(ctx: SetupContext): S;

  /**
   * 액션을 적용해 다음 상태를 돌려준다. (방장 전용)
   * 인자로 받는 state 는 복사본이므로 직접 수정해도 안전하다.
   * 규칙 위반이면 IllegalAction 을 던진다.
   */
  reduce(state: S, action: A, ctx: ActionContext): S;

  /**
   * viewer 가 볼 수 있는 정보만 남긴 상태. 생략하면 전체 상태를 모두에게 보낸다.
   * viewerId 가 참가자가 아니면(관전자) 모든 비공개 정보를 가려야 한다.
   */
  view?(state: S, viewerId: string): S;

  /** 게임이 끝났으면 결과를 돌려준다. 프레임워크가 종료 배너와 대기실 복귀 버튼을 띄운다. */
  result?(state: S, players: PlayerInfo[]): GameResult | null;

  /** 실시간/타이머 게임용. intervalMs 마다 방장에서 update 를 호출한다. */
  tick?: {
    intervalMs: number;
    update(state: S, ctx: TickContext): S;
  };

  /**
   * 게임 도중 참가자가 나갔을 때. 계속 진행 가능한 상태를 돌려주거나,
   * null 을 돌려주면(또는 생략하면) 게임을 종료하고 모두 대기실로 돌아간다.
   */
  onPlayerLeave?(state: S, playerId: string, ctx: TickContext): S | null;

  createLocal?(): L;

  render(container: HTMLElement, state: S, ctx: RenderContext<A, L>): void;
}

/** 타입 추론용 헬퍼: `export default defineGame<State, Action, Local>({...})` */
export function defineGame<S, A, L = Record<string, never>>(def: GameDefinition<S, A, L>): GameDefinition<S, A, L> {
  return def;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameDefinition = GameDefinition<any, any, any>;
