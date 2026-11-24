import type { NaishiGameState, NaishiPlayerState, NaishiCard, NaishiCardType, NaishiZone } from './types';

import { IllegalAction } from '../../framework/types';

/*
 * 규칙 (원작 규칙서 / BGA 도움말 기준, 단순화한 부분은 '가정'으로 표시):
 *  - 준비: 각자 줄(Line)에 산 5장, 손(Hand)에 산 3장 + 개발 카드 2장(섞음).
 *    가정: 원작의 개발 카드 드래프트는 생략하고 무작위 2장을 준다.
 *  - 강(River): 5개 더미 × 6장, 각 더미 맨 위 카드가 공개된다.
 *  - 주 행동 (턴마다 하나):
 *      개발 — 줄/손의 i번 카드를 버리고, 강 i번 더미의 공개 카드를 그 자리에 놓는다.
 *      사절 회수 — 궁정에 보낸 사절을 돌려받는다 (칙령 칸 사절은 제외).
 *      종료 선언 — 강의 뽑을 더미가 하나라도 바닥나면 가능. 상대가 마지막 턴을 한 번 더 한다.
 *  - 사절 보너스 행동 (턴마다 최대 하나, 주 행동 전/후, 사절 1개 소모):
 *      교환 — 줄 두 장 / 손 두 장 / 같은 위치의 손·줄 / 강 공개 카드 두 장.
 *      강 정리 — 서로 다른 강 더미 두 곳의 공개 카드를 버리고 다음 카드를 공개.
 *      황제 칙령 — 게임 전체에서 한 번. 같은 위치의 줄 또는 손 카드를 상대와 맞바꾼다.
 *                  여기 놓인 사절은 돌아오지 않는다.
 *  - 종료: 선언 후 상대의 마지막 턴이 끝나거나, 뽑을 더미 두 개가 바닥났을 때
 *    (선 플레이어 턴에 바닥나면 후 플레이어가 한 턴 더).
 *    가정: "뽑을 더미가 바닥남" = 더미에 공개 카드 하나 이하만 남음.
 *  - 가정: 닌자(다른 캐릭터 복사)는 점수 계산에서 0점으로 둔다 (기존 구현 유지).
 */

const DEV_TYPES: NaishiCardType[] = [
  'naishi', 'advisor', 'fort', 'sentinel',
  'torii', 'monk', 'rice_field', 'banner', 'horseman', 'ronin', 'ninja',
];

const CARDS_PER_TYPE = 4;
const RIVER_PILES = 5;
const CARDS_PER_PILE = 6;
export const EMISSARIES_PER_PLAYER = 2;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let mountainId = 1000;
const mountain = (): NaishiCard => ({ type: 'mountain', id: mountainId++ });

export function createInitialGameState(player1Id: string, player2Id: string): NaishiGameState {
  const deck: NaishiCard[] = [];
  let id = 0;
  for (const type of DEV_TYPES) for (let i = 0; i < CARDS_PER_TYPE; i++) deck.push({ type, id: id++ });
  const shuffled = shuffleArray(deck);

  const riverPiles: NaishiCard[][] = [];
  for (let i = 0; i < RIVER_PILES; i++) riverPiles.push(shuffled.splice(0, CARDS_PER_PILE));

  const createPlayerState = (): NaishiPlayerState => ({
    line: [mountain(), mountain(), mountain(), mountain(), mountain()],
    hand: shuffleArray([mountain(), mountain(), mountain(), shuffled.pop()!, shuffled.pop()!]),
    emissaryTokens: EMISSARIES_PER_PLAYER,
    usedImperialDecree: false,
  });

  const gs: NaishiGameState = {
    phase: 'playing',
    river: [],
    riverSizes: [],
    riverPiles,
    discardPile: [],
    players: {
      [player1Id]: createPlayerState(),
      [player2Id]: createPlayerState(),
    },
    currentPlayer: player1Id,
    firstPlayer: player1Id,
    mainDone: false,
    bonusUsed: false,
    decreeUsedBy: null,
    finalTurnOf: null,
    lastAction: '',
    winner: null,
    winnerReason: '',
  };
  syncRiver(gs);
  return gs;
}

/** riverPiles 에서 공개 카드·장수를 다시 계산한다 */
export function syncRiver(gs: NaishiGameState) {
  gs.river = gs.riverPiles.map((p) => p[0] ?? null);
  gs.riverSizes = gs.riverPiles.map((p) => p.length);
}

const drawPileEmpty = (gs: NaishiGameState, i: number) => gs.riverSizes[i] <= 1;
const emptyDrawPiles = (gs: NaishiGameState) => gs.riverSizes.filter((_, i) => drawPileEmpty(gs, i)).length;

export function canDeclareEnd(gs: NaishiGameState): boolean {
  return gs.finalTurnOf === null && gs.riverSizes.some((_, i) => drawPileEmpty(gs, i));
}

export function opponentOf(gs: NaishiGameState, playerId: string): string {
  return Object.keys(gs.players).find((id) => id !== playerId)!;
}

const ZONE_NAME = { line: '줄', hand: '손' } as const;
const validIndex = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < 5;

function requireMainAvailable(gs: NaishiGameState) {
  if (gs.mainDone) throw new IllegalAction('이번 턴의 주 행동을 이미 했습니다.');
}

function spendEmissary(gs: NaishiGameState, playerId: string) {
  if (gs.bonusUsed) throw new IllegalAction('사절 행동은 턴마다 한 번만 할 수 있습니다.');
  const me = gs.players[playerId];
  if (me.emissaryTokens <= 0) throw new IllegalAction('남은 사절이 없습니다. 먼저 회수하세요.');
  me.emissaryTokens--;
  gs.bonusUsed = true;
}

// ── 주 행동 ──

export function develop(gs: NaishiGameState, playerId: string, zone: NaishiZone, index: number): NaishiGameState {
  requireMainAvailable(gs);
  if ((zone !== 'line' && zone !== 'hand') || !validIndex(index)) throw new IllegalAction('잘못된 위치입니다.');
  const pile = gs.riverPiles[index];
  if (!pile.length) throw new IllegalAction(`강 ${index + 1}번 더미가 비었습니다.`);
  const me = gs.players[playerId];
  const taken = pile.shift()!;
  const old = me[zone][index];
  if (old) gs.discardPile.push(old);
  me[zone][index] = taken;
  syncRiver(gs);
  gs.mainDone = true;
  gs.lastAction = `${ZONE_NAME[zone]} ${index + 1}번 자리에 강의 카드를 들여왔습니다.`;
  return gs;
}

export function recallEmissaries(gs: NaishiGameState, playerId: string): NaishiGameState {
  requireMainAvailable(gs);
  const me = gs.players[playerId];
  const max = EMISSARIES_PER_PLAYER - (me.usedImperialDecree ? 1 : 0);
  if (me.emissaryTokens >= max) throw new IllegalAction('회수할 사절이 없습니다.');
  me.emissaryTokens = max;
  gs.mainDone = true;
  gs.lastAction = '사절을 회수했습니다.';
  return gs;
}

export function declareEnd(gs: NaishiGameState, playerId: string): NaishiGameState {
  requireMainAvailable(gs);
  if (gs.bonusUsed) throw new IllegalAction('종료를 선언하는 턴에는 다른 행동을 할 수 없습니다.');
  if (!canDeclareEnd(gs)) throw new IllegalAction('아직 종료를 선언할 수 없습니다.');
  gs.finalTurnOf = opponentOf(gs, playerId);
  gs.mainDone = true;
  gs.lastAction = '게임 종료를 선언했습니다. 상대의 마지막 턴입니다.';
  return endTurn(gs, true);
}

// ── 사절 보너스 행동 ──

export type SwapKind = 'line' | 'hand' | 'column' | 'river';

export function swapPositions(gs: NaishiGameState, playerId: string, kind: SwapKind, i: number, j: number): NaishiGameState {
  if (!validIndex(i) || !validIndex(j)) throw new IllegalAction('잘못된 위치입니다.');
  const me = gs.players[playerId];
  if (kind === 'column') {
    if (i !== j) throw new IllegalAction('손과 줄은 같은 위치끼리만 바꿀 수 있습니다.');
    spendEmissary(gs, playerId);
    [me.hand[i], me.line[i]] = [me.line[i], me.hand[i]];
    gs.lastAction = `사절: ${i + 1}번 위치의 손·줄 카드를 맞바꿨습니다.`;
    return gs;
  }
  if (i === j) throw new IllegalAction('서로 다른 두 곳을 고르세요.');
  if (kind === 'river') {
    const a = gs.riverPiles[i];
    const b = gs.riverPiles[j];
    if (!a.length || !b.length) throw new IllegalAction('빈 더미의 카드는 바꿀 수 없습니다.');
    spendEmissary(gs, playerId);
    [a[0], b[0]] = [b[0], a[0]];
    syncRiver(gs);
    gs.lastAction = `사절: 강 ${i + 1}번과 ${j + 1}번 카드를 맞바꿨습니다.`;
    return gs;
  }
  if (kind !== 'line' && kind !== 'hand') throw new IllegalAction('잘못된 교환입니다.');
  spendEmissary(gs, playerId);
  const zone = me[kind];
  [zone[i], zone[j]] = [zone[j], zone[i]];
  gs.lastAction = `사절: ${ZONE_NAME[kind]}의 ${i + 1}번과 ${j + 1}번 카드를 맞바꿨습니다.`;
  return gs;
}

export function removeFromRiver(gs: NaishiGameState, playerId: string, i: number, j: number): NaishiGameState {
  if (!validIndex(i) || !validIndex(j) || i === j) throw new IllegalAction('서로 다른 강 더미 두 곳을 고르세요.');
  if (!gs.riverPiles[i].length || !gs.riverPiles[j].length) throw new IllegalAction('빈 더미는 고를 수 없습니다.');
  spendEmissary(gs, playerId);
  gs.discardPile.push(gs.riverPiles[i].shift()!, gs.riverPiles[j].shift()!);
  syncRiver(gs);
  gs.lastAction = `사절: 강 ${i + 1}번과 ${j + 1}번의 카드를 버렸습니다.`;
  return gs;
}

export function imperialDecree(gs: NaishiGameState, playerId: string, zone: NaishiZone, index: number): NaishiGameState {
  if ((zone !== 'line' && zone !== 'hand') || !validIndex(index)) throw new IllegalAction('잘못된 위치입니다.');
  if (gs.decreeUsedBy) throw new IllegalAction('황제 칙령은 이미 사용되었습니다.');
  spendEmissary(gs, playerId);
  const me = gs.players[playerId];
  const opp = gs.players[opponentOf(gs, playerId)];
  [me[zone][index], opp[zone][index]] = [opp[zone][index], me[zone][index]];
  me.usedImperialDecree = true;
  gs.decreeUsedBy = playerId;
  gs.lastAction = `황제 칙령: ${ZONE_NAME[zone]} ${index + 1}번 카드를 상대와 맞바꿨습니다.`;
  return gs;
}

// ── 턴 종료 ──

export function endTurn(gs: NaishiGameState, declared = false): NaishiGameState {
  if (!gs.mainDone) throw new IllegalAction('먼저 주 행동(개발·사절 회수·종료 선언)을 하세요.');
  const current = gs.currentPlayer;
  const other = opponentOf(gs, current);

  if (!declared) {
    if (gs.finalTurnOf === current) return { ...gs, phase: 'game_over', winnerReason: '종료 선언 후 마지막 턴 종료' };
    if (gs.finalTurnOf === null && emptyDrawPiles(gs) >= 2) {
      // 선 플레이어 턴에 끝나면 후 플레이어가 한 턴 더 한다
      if (current !== gs.firstPlayer) return { ...gs, phase: 'game_over', winnerReason: '강 더미 두 개 소진' };
      gs.finalTurnOf = other;
      gs.lastAction += ' 강 더미 두 개가 바닥났습니다. 상대의 마지막 턴입니다.';
    }
  }

  return { ...gs, currentPlayer: other, mainDone: false, bonusUsed: false };
}

export function countUniqueTypes(cards: (NaishiCard | null)[]): number {
  const types = new Set<NaishiCardType>();
  for (const card of cards) {
    if (card && card.type !== 'ninja' && card.type !== 'mountain') {
      types.add(card.type);
    }
  }
  return types.size;
}

export function calculateScore(gs: NaishiGameState, playerId: string): number {
  const player = gs.players[playerId];
  if (!player) return 0;

  let score = 0;

  const lineTypes = player.line.map((c) => c?.type || null);
  const handTypes = player.hand.map((c) => c?.type || null);

  for (let i = 0; i < 5; i++) {
    const lineCard = player.line[i];
    const handCard = player.hand[i];

    if (lineCard) {
      score += calculateCardScore(lineCard.type, 'line', i, lineTypes, handTypes);
    }
    if (handCard) {
      score += calculateCardScore(handCard.type, 'hand', i, lineTypes, handTypes);
    }
  }

  return score;
}

function calculateCardScore(
  type: NaishiCardType,
  zone: 'line' | 'hand',
  position: number,
  lineTypes: (NaishiCardType | null)[],
  handTypes: (NaishiCardType | null)[],
): number {
  switch (type) {
    case 'mountain': {
      const count = lineTypes.filter((t) => t === 'mountain').length +
        handTypes.filter((t) => t === 'mountain').length;
      return count === 1 ? 5 : -5;
    }

    case 'naishi':
      if (position === 2) {
        return zone === 'line' ? 12 : 8;
      }
      return 0;

    case 'advisor': {
      let base;
      if (position === 0 || position === 4) base = 2;
      else if (position === 1 || position === 3) base = 4;
      else base = 3;

      let adjacentNaishi = 0;
      if (position > 0 && lineTypes[position - 1] === 'naishi') adjacentNaishi++;
      if (position < 4 && lineTypes[position + 1] === 'naishi') adjacentNaishi++;
      if (handTypes[position] === 'naishi') adjacentNaishi++;

      return base + adjacentNaishi * 4;
    }

    case 'fort':
      return (position === 0 || position === 4) ? 6 : 0;

    case 'sentinel': {
      let adjacentSentinel = false;
      if (position > 0 && lineTypes[position - 1] === 'sentinel') adjacentSentinel = true;
      if (position < 4 && lineTypes[position + 1] === 'sentinel') adjacentSentinel = true;

      let adjacentFort = 0;
      if (position > 0 && lineTypes[position - 1] === 'fort') adjacentFort++;
      if (position < 4 && lineTypes[position + 1] === 'fort') adjacentFort++;

      return (adjacentSentinel ? 0 : 3) + adjacentFort * 4;
    }

    case 'torii': {
      const count = lineTypes.filter((t) => t === 'torii').length +
        handTypes.filter((t) => t === 'torii').length;
      if (count === 1) return -5;
      if (count === 2) return 0;
      return 30;
    }

    case 'monk': {
      const base = zone === 'hand' ? 5 : 0;
      let adjacentTorii = 0;
      if (position > 0 && lineTypes[position - 1] === 'torii') adjacentTorii++;
      if (position < 4 && lineTypes[position + 1] === 'torii') adjacentTorii++;
      return base + adjacentTorii * 2;
    }

    case 'rice_field': {
      let groupSize = 1;
      for (let i = position - 1; i >= 0; i--) {
        if (lineTypes[i] === 'rice_field') groupSize++;
        else break;
      }
      for (let i = position + 1; i < 5; i++) {
        if (lineTypes[i] === 'rice_field') groupSize++;
        else break;
      }
      if (groupSize >= 4) return 30;
      if (groupSize === 3) return 20;
      if (groupSize === 2) return 10;
      return 0;
    }

    case 'banner': {
      const count = lineTypes.filter((t) => t === 'banner').length;
      return count === 1 ? 3 : count >= 2 ? 8 : 0;
    }

    case 'horseman': {
      let base = zone === 'hand' ? 3 : 0;
      if (lineTypes[position] === 'banner') base += 10;
      return base;
    }

    case 'ronin': {
      const uniqueTypes = countUniqueTypes([...lineTypes.map((t) => t ? { type: t } as NaishiCard : null),
        ...handTypes.map((t) => t ? { type: t } as NaishiCard : null)]);
      if (uniqueTypes >= 10) return 45;
      if (uniqueTypes === 9) return 15;
      if (uniqueTypes === 8) return 8;
      return 0;
    }

    case 'ninja':
      return 0;

    default:
      return 0;
  }
}
