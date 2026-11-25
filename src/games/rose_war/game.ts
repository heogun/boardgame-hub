/**
 * 장미 전쟁 — 이 허브를 위해 만든 오리지널 2인 게임.
 *
 *  - 7×7 정원. 두 가문(붉은/흰)이 함께 쓰는 깃발 하나가 가운데에서 시작한다.
 *  - 이동 카드 24장 (8방향 × 거리 1~3). 각자 비공개 손패 4장.
 *  - 내 차례에 하나를 한다:
 *      진군 — 카드를 내 깃발을 그 방향·거리만큼 옮기고, 도착한 빈 칸에 내 장미를 심는다.
 *             도착 칸은 정원 안이고 장미가 없어야 한다. 깃발이 지나가는 칸은 상관없다.
 *             돌격: 이동한 직선(앞뒤 양쪽)에서, 새 장미와 내 다른 장미 사이에 끼인
 *             상대 장미 줄을 모두 내 색으로 뒤집는다.
 *      재집결 — 손패를 모두 버리고 4장을 새로 받는다 (게임당 3번).
 *      대기 — 낼 수 있는 카드가 없을 때만.
 *    진군하면 쓴 카드를 버리고 1장을 뽑는다. 덱이 비면 버린 카드를 섞어 다시 덱으로 만든다.
 *  - 종료: 두 플레이어가 연달아 대기하거나, 두 가문 모두 장미(각 24송이)를 다 심었을 때.
 *  - 점수: 가로·세로로 이어진 내 장미 무리마다 n(n+1)/2 점 (1→1, 2→3, 3→6, 4→10 …).
 *    동점이면 정원에 있는 장미가 많은 쪽, 그래도 같으면 무승부.
 */
import { IllegalAction } from '../../framework/types';

export const SIZE = 7;
export const HAND_SIZE = 4;
export const ROSES_PER_HOUSE = 24;
export const RALLIES_PER_GAME = 3;

export type House = 'red' | 'white';

/** 방향 0~7: 북, 북동, 동, 남동, 남, 남서, 서, 북서 */
export const DIRS: [number, number][] = [
  [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1],
];

export interface MoveCard {
  id: number;
  dir: number;
  dist: number;
}

export interface RoseWarPlayer {
  house: House;
  hand: MoveCard[];
  roses: number;
  rallies: number;
}

export interface RoseWarState {
  /** board[r][c] */
  board: (House | null)[][];
  banner: [number, number];
  deck: MoveCard[];
  discard: MoveCard[];
  players: Record<string, RoseWarPlayer>;
  order: string[];
  turn: string;
  passes: number;
  over: boolean;
  /** 마지막 진군 (화면 강조용) */
  lastMove: { from: [number, number]; to: [number, number]; flipped: [number, number][] } | null;
  lastAction: string;
}

export type RoseWarAction =
  | { type: 'march'; cardId: number }
  | { type: 'rally' }
  | { type: 'pass' };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDeck(): MoveCard[] {
  const cards: MoveCard[] = [];
  let id = 0;
  for (let dir = 0; dir < 8; dir++) for (let dist = 1; dist <= 3; dist++) cards.push({ id: id++, dir, dist });
  return shuffle(cards);
}

export function setupState(ids: string[]): RoseWarState {
  const deck = createDeck();
  const players: Record<string, RoseWarPlayer> = {};
  ids.forEach((id, i) => {
    players[id] = { house: i === 0 ? 'red' : 'white', hand: deck.splice(0, HAND_SIZE), roses: ROSES_PER_HOUSE, rallies: RALLIES_PER_GAME };
  });
  const mid = Math.floor(SIZE / 2);
  return {
    board: Array.from({ length: SIZE }, () => Array<House | null>(SIZE).fill(null)),
    banner: [mid, mid],
    deck,
    discard: [],
    players,
    order: ids,
    turn: ids[0],
    passes: 0,
    over: false,
    lastMove: null,
    lastAction: '',
  };
}

const inside = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

/** 카드로 깃발이 도착할 칸. 정원 밖이거나 장미가 있으면 null */
export function target(gs: RoseWarState, card: MoveCard): [number, number] | null {
  const [dr, dc] = DIRS[card.dir];
  const r = gs.banner[0] + dr * card.dist;
  const c = gs.banner[1] + dc * card.dist;
  return inside(r, c) && !gs.board[r][c] ? [r, c] : null;
}

export function canMarch(gs: RoseWarState, playerId: string): boolean {
  const p = gs.players[playerId];
  return p.roses > 0 && p.hand.some((card) => target(gs, card));
}

function draw(gs: RoseWarState, p: RoseWarPlayer, n: number) {
  for (let i = 0; i < n; i++) {
    if (!gs.deck.length) {
      if (!gs.discard.length) return;
      gs.deck = shuffle(gs.discard);
      gs.discard = [];
    }
    p.hand.push(gs.deck.pop()!);
  }
}

const opponentOf = (gs: RoseWarState, id: string) => gs.order.find((x) => x !== id)!;

function endTurn(gs: RoseWarState) {
  const ids = gs.order;
  const allPlanted = ids.every((id) => gs.players[id].roses === 0);
  if (gs.passes >= 2 || allPlanted) {
    gs.over = true;
    return;
  }
  gs.turn = opponentOf(gs, gs.turn);
}

export function applyAction(gs: RoseWarState, action: RoseWarAction, playerId: string, name: string): RoseWarState {
  if (gs.over) throw new IllegalAction('게임이 끝났습니다.');
  const me = gs.players[playerId];
  if (!me) throw new IllegalAction('참가자가 아닙니다.');
  if (gs.turn !== playerId) throw new IllegalAction('당신의 차례가 아닙니다.');

  switch (action.type) {
    case 'march': {
      if (me.roses <= 0) throw new IllegalAction('심을 장미가 남아 있지 않습니다.');
      const at = me.hand.findIndex((c) => c.id === action.cardId);
      if (at === -1) throw new IllegalAction('손에 없는 카드입니다.');
      const card = me.hand[at];
      const to = target(gs, card);
      if (!to) throw new IllegalAction('그 카드로는 정원 밖이나 장미가 있는 칸으로 가게 됩니다.');

      const from = gs.banner;
      gs.board[to[0]][to[1]] = me.house;
      me.roses--;
      gs.banner = to;
      me.hand.splice(at, 1);
      gs.discard.push(card);
      draw(gs, me, 1);

      // 돌격: 이동한 직선의 앞뒤로 끼인 상대 장미를 뒤집는다
      const flipped: [number, number][] = [];
      const [dr, dc] = DIRS[card.dir];
      for (const sign of [1, -1]) {
        const line: [number, number][] = [];
        let r = to[0] + dr * sign;
        let c = to[1] + dc * sign;
        while (inside(r, c) && gs.board[r][c] && gs.board[r][c] !== me.house) {
          line.push([r, c]);
          r += dr * sign;
          c += dc * sign;
        }
        if (line.length && inside(r, c) && gs.board[r][c] === me.house) flipped.push(...line);
      }
      for (const [r, c] of flipped) gs.board[r][c] = me.house;

      gs.passes = 0;
      gs.lastMove = { from, to, flipped };
      gs.lastAction = `${name}: 진군해 장미를 심었습니다${flipped.length ? ` — 돌격으로 ${flipped.length}송이를 뒤집었습니다!` : '.'}`;
      break;
    }
    case 'rally': {
      if (me.rallies <= 0) throw new IllegalAction('재집결 기회를 모두 썼습니다.');
      gs.discard.push(...me.hand);
      me.hand = [];
      draw(gs, me, HAND_SIZE);
      me.rallies--;
      gs.passes = 0;
      gs.lastMove = null;
      gs.lastAction = `${name}: 재집결해 손패를 새로 받았습니다.`;
      break;
    }
    case 'pass': {
      if (canMarch(gs, playerId)) throw new IllegalAction('낼 수 있는 카드가 있으면 대기할 수 없습니다.');
      gs.passes++;
      gs.lastMove = null;
      gs.lastAction = `${name}: 대기했습니다.`;
      break;
    }
    default:
      throw new IllegalAction('알 수 없는 행동입니다.');
  }
  endTurn(gs);
  return gs;
}

/** 이어진 무리 크기 목록 */
export function groups(gs: RoseWarState, house: House): number[] {
  const seen = gs.board.map((row) => row.map(() => false));
  const sizes: number[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (seen[r][c] || gs.board[r][c] !== house) continue;
      let n = 0;
      const stack: [number, number][] = [[r, c]];
      seen[r][c] = true;
      while (stack.length) {
        const [y, x] = stack.pop()!;
        n++;
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy;
          const nx = x + dx;
          if (inside(ny, nx) && !seen[ny][nx] && gs.board[ny][nx] === house) {
            seen[ny][nx] = true;
            stack.push([ny, nx]);
          }
        }
      }
      sizes.push(n);
    }
  }
  return sizes.sort((a, b) => b - a);
}

export function score(gs: RoseWarState, house: House): number {
  return groups(gs, house).reduce((s, n) => s + (n * (n + 1)) / 2, 0);
}

export function roseCount(gs: RoseWarState, house: House): number {
  return gs.board.flat().filter((h) => h === house).length;
}
