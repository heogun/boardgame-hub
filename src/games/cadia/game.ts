import { IllegalAction } from '../../framework/types';
import type {
  CardiaCard,
  CardiaChoice,
  CardiaDeckType,
  CardiaEncounter,
  CardiaFaction,
  CardiaGameState,
  CardiaLocation,
  CardiaPlayedCard,
} from './types';

const DECK_I: CardiaCard[] = [
  { influence: 1, name: 'Hired Blade', ability: 'Discard both this card and the opposing card', abilityType: 'instant', faction: 'rebellion' },
  { influence: 2, name: 'Void Mage', ability: 'Remove all Modifiers or all Ongoing tokens from any one card', abilityType: 'instant', faction: 'academy' },
  { influence: 3, name: 'Surgeon', ability: 'Add -5 influence to the next card you play', abilityType: 'instant', faction: 'guild' },
  { influence: 4, name: 'Mediator', ability: 'This encounter is a tie', abilityType: 'ongoing', faction: 'dynasty' },
  { influence: 5, name: 'Saboteur', ability: 'Your opponent discards the top 2 cards of their deck', abilityType: 'instant', faction: 'rebellion' },
  { influence: 6, name: 'Fortune Teller', ability: 'In the next Encounter, your opponent plays their card face up before you play your card', abilityType: 'instant', faction: 'academy' },
  { influence: 7, name: 'Palace Guard', ability: 'Your opponent discards a card of your choice from their hand', abilityType: 'instant', faction: 'dynasty' },
  { influence: 8, name: 'Judge', ability: 'You win all tied encounters, including upcoming ones', abilityType: 'ongoing', faction: 'academy' },
  { influence: 9, name: 'Ambusher', ability: 'Choose a faction. Your opponent discards all cards of the chosen faction from their hand', abilityType: 'instant', faction: 'rebellion' },
  { influence: 10, name: 'Puppeteer', ability: 'Discard the opposing card. Replace it with a card you randomly draw from your opponent\'s hand', abilityType: 'instant', faction: 'guild' },
  { influence: 11, name: 'Clockmaker', ability: 'Add +3 influence to your card in the previous encounter as well as to the next card you play', abilityType: 'instant', faction: 'guild' },
  { influence: 12, name: 'Revolutionary', ability: 'Your opponent discards 1 card from their hand', abilityType: 'instant', faction: 'rebellion' },
  { influence: 13, name: 'Swamp Guardian', ability: 'At the end of the round, draw 1 extra card', abilityType: 'ongoing', faction: 'rebellion' },
  { influence: 14, name: 'Treasurer', ability: 'Place an additional signet on the card', abilityType: 'ongoing', faction: 'dynasty' },
  { influence: 15, name: 'Inventor', ability: 'Add +3 influence to any one card and -3 influence to any other card', abilityType: 'instant', faction: 'guild' },
  { influence: 16, name: 'Djinn', ability: 'You immediately win the game', abilityType: 'instant', faction: 'dynasty' },
];

const DECK_II: CardiaCard[] = [
  { influence: 1, name: 'Aristocrat', ability: 'Gain 1 additional signet if you win this encounter', abilityType: 'instant', faction: 'dynasty' },
  { influence: 2, name: 'Librarian', ability: 'Draw 2 cards from your deck', abilityType: 'instant', faction: 'academy' },
  { influence: 3, name: 'Elemental', ability: 'Change the faction of any one card to any faction', abilityType: 'instant', faction: 'rebellion' },
  { influence: 4, name: 'Successor', ability: 'Take the signet from the previous encounter if you win this one', abilityType: 'instant', faction: 'dynasty' },
  { influence: 5, name: 'Tax Collector', ability: 'Your opponent loses 1 signet if they have any', abilityType: 'instant', faction: 'dynasty' },
  { influence: 6, name: 'Poisoner', ability: 'Add -3 influence to the opposing card', abilityType: 'instant', faction: 'guild' },
  { influence: 7, name: 'Engineer', ability: 'Add +3 influence to any one card', abilityType: 'instant', faction: 'guild' },
  { influence: 8, name: 'Counselor', ability: 'You win the previous encounter even if it is a tie', abilityType: 'instant', faction: 'academy' },
  { influence: 9, name: 'Blackmailer', ability: 'Your opponent discards 2 cards from their hand', abilityType: 'instant', faction: 'rebellion' },
  { influence: 10, name: 'Envoy', ability: 'Add +5 influence to any one card', abilityType: 'instant', faction: 'dynasty' },
  { influence: 11, name: 'Clockmaker', ability: 'Add +3 influence to your card in the previous encounter as well as to the next card you play', abilityType: 'instant', faction: 'guild' },
  { influence: 12, name: 'Illusionist', ability: 'Copy and activate one of your opponent\'s played card\'s ability', abilityType: 'instant', faction: 'academy' },
  { influence: 13, name: 'Kinesis Mage', ability: 'Move all modifiers and ongoing tokens from one card to another', abilityType: 'instant', faction: 'rebellion' },
  { influence: 14, name: 'Prodigy', ability: 'Add +5 influence to the Prodigy', abilityType: 'instant', faction: 'academy' },
  { influence: 15, name: 'Magistra', ability: 'Copy and activate one of your own played card\'s ability', abilityType: 'instant', faction: 'academy' },
  { influence: 16, name: 'Mechanical Djinn', ability: 'You immediately win the game', abilityType: 'instant', faction: 'guild' },
];

/** 가정: 안개 늪(Foggy Swamp)은 조우 진행 방식 자체를 바꿔서 구현하지 않았다 → 선택지에서 뺀다. */
export const UNSUPPORTED_LOCATIONS = ['foggy-swamp'];

export const LOCATIONS: CardiaLocation[] = [
  { id: 'serpent-temple', name: 'Serpent Temple', stars: 1, ability: 'Whenever you win an encounter, draw 1 card and your opponent discards 1 card' },
  { id: 'bazaar', name: 'Bazaar', stars: 1, ability: 'At the end of each round, do not draw cards. Whenever you have 1 card or fewer in hand, immediately draw 4 cards' },
  { id: 'founders-day', name: "Founder's Day", stars: 1, ability: 'If you ever win 3 successive encounters, you immediately win the game' },
  { id: 'grand-library', name: 'Grand Library', stars: 2, ability: 'At the beginning of the game, draw 2 cards instead of 5. At the end of each round, draw 2 cards instead of 1' },
  { id: 'scrapyard', name: 'Scrapyard', stars: 2, ability: 'At the end of each round, draw 2 cards instead of 1. Then place 1 card from your hand under your deck' },
  { id: 'auction-house', name: 'Auction House', stars: 2, ability: 'Whenever you reveal a card that has less Influence than your card in the previous encounter, discard the top card of your deck' },
  { id: 'haunted-catacombs', name: 'Haunted Catacombs', stars: 3, ability: 'If you reveal a card of the same faction as your card in the previous encounter, you immediately lose the game' },
  { id: 'foggy-swamp', name: 'Foggy Swamp', stars: 3, ability: 'Do not reveal your cards in encounters after placing them. Instead, reveal and resolve the top pair first, then the next, and so on' },
];

/*
 * 규칙 요약 (공식 규칙서 기준) 과 구현 가정:
 *  - 두 플레이어가 동시에 카드를 내고 공개한다. 영향력(기본값 + 수정치)이 높은 쪽이 인장을 얻는다.
 *  - 진 카드의 주인만 그 카드의 능력을 발동한다. 무승부면 아무 능력도 발동하지 않는다.
 *  - 인장은 카드 위에 놓인다. 지난 조우의 영향력이 바뀌면 그 조우를 다시 판정하고 인장이 옮겨진다
 *    (recompute). 이렇게 승패가 바뀌어도 새로 진 카드의 능력은 발동하지 않는다.
 *  - 지속 능력은 카드에 토큰을 놓고, 토큰이 있는 동안 효과가 유지된다.
 *  - 승리: 능력으로 즉시 승리(지니) / 인장 5개 이상이면서 상대보다 많음 / 상대가 낼 카드가 없음.
 *    둘 다 낼 카드가 없으면 인장이 많은 쪽, 같으면 무승부.
 *
 *  가정 (규칙서에 명확하지 않거나 단순화한 것):
 *  - 중재자(Mediator) 토큰이 있는 조우는 무조건 무승부이며 판사(Judge)보다 우선한다.
 *  - 판사 토큰을 양쪽 모두 가지고 있으면 무승부는 무승부로 남는다.
 *  - 상담가(Counselor): 직전 조우의 결과와 관계없이 그 조우를 이긴 것으로 한다.
 *  - 귀족(Aristocrat)·계승자(Successor): 지속 토큰으로 처리한다 (나중에 이 조우를 이기게 되면 효과).
 *  - 세금 징수원(Tax Collector): 상대 인장 합계에서 1을 영구히 뺀다 (0 미만으로는 내려가지 않음).
 *  - 궁정 경비병(Palace Guard): 능력을 쓰는 동안 상대 손패를 보고 고른다.
 *  - 혁명가·협박꾼: 버릴 카드는 상대가 직접 고른다.
 *  - 환술사·마기스트라: 즉시 능력 카드만 복사할 수 있고, 복사 능력 카드(환술사·마기스트라)는 고를 수 없다.
 *    마기스트라의 '영향력이 같거나 높은 카드' 제한은 적용하지 않는다.
 *  - 뱀 신전(Serpent Temple): 상대가 버리는 카드는 무작위.
 *  - 유령 지하묘지(Haunted Catacombs): 둘이 동시에 걸리면 무승부로 끝난다.
 */

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const WIN_SIGNETS = 5;
const LOG_SIZE = 8;

export function createInitialGameState(
  player1Id: string,
  player2Id: string,
  deckType: CardiaDeckType = 'deck1',
  location: CardiaLocation | null = null,
): CardiaGameState {
  const handSize = location?.id === 'grand-library' ? 2 : 5;

  const deck1 = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const deck2 = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  const hand1 = deck1.splice(0, handSize);
  const hand2 = deck2.splice(0, handSize);

  return {
    phase: 'playing',
    deckType,
    location,
    encounters: [],
    signets: { [player1Id]: 0, [player2Id]: 0 },
    signetPenalty: { [player1Id]: 0, [player2Id]: 0 },
    players: {
      [player1Id]: { hand: hand1, deck: deck1, discardPile: [] },
      [player2Id]: { hand: hand2, deck: deck2, discardPile: [] },
    },
    winner: null,
    winnerReason: '',
    maxRounds: 16,
    pending: {},
    nextModifiers: { [player1Id]: [], [player2Id]: [] },
    playsFirst: null,
    pendingBottom: [],
    choice: null,
    log: [],
  };
}

export function getCard(influence: number, deckType: CardiaDeckType = 'deck1'): CardiaCard {
  const deck = deckType === 'deck2' ? DECK_II : DECK_I;
  return deck[influence - 1];
}

/** 카드 번호(0~15)로 카드 정보 */
export const cardOf = (gs: CardiaGameState, card: number) => getCard(card + 1, gs.deckType);

export function effectiveInfluence(gs: CardiaGameState, pc: CardiaPlayedCard): number {
  return cardOf(gs, pc.card).influence + pc.modifiers.reduce((a, b) => a + b, 0);
}

export function opponentOf(gs: CardiaGameState, playerId: string): string {
  return Object.keys(gs.players).find((id) => id !== playerId)!;
}

function log(gs: CardiaGameState, msg: string) {
  gs.log.push(msg);
  if (gs.log.length > LOG_SIZE) gs.log.splice(0, gs.log.length - LOG_SIZE);
}

/** 버려지지 않은 조우의 카드 (= 아직 '놓여 있는' 카드) */
function cardsInPlay(gs: CardiaGameState): { enc: number; side: string; pc: CardiaPlayedCard }[] {
  const out: { enc: number; side: string; pc: CardiaPlayedCard }[] = [];
  gs.encounters.forEach((e, enc) => {
    if (e.discarded) return;
    for (const [side, pc] of Object.entries(e.cards)) out.push({ enc, side, pc });
  });
  return out;
}

function hasActiveToken(gs: CardiaGameState, playerId: string, token: CardiaPlayedCard['tokens'][number]): boolean {
  return cardsInPlay(gs).some((c) => c.side === playerId && c.pc.tokens.includes(token));
}

/** 모든 조우의 승패와 인장을 다시 계산한다. 능력은 발동하지 않는다. */
export function recompute(gs: CardiaGameState) {
  const ids = Object.keys(gs.players);
  const judges = ids.filter((id) => hasActiveToken(gs, id, 'judge'));

  for (const e of gs.encounters) {
    e.winner = null;
    if (e.discarded) continue;
    const pcs = ids.map((id) => e.cards[id]);
    if (pcs.some((pc) => pc.tokens.includes('mediator'))) continue;
    if (e.forcedWinner) {
      e.winner = e.forcedWinner;
      continue;
    }
    const [a, b] = pcs.map((pc) => effectiveInfluence(gs, pc));
    if (a > b) e.winner = ids[0];
    else if (b > a) e.winner = ids[1];
    else if (judges.length === 1) e.winner = judges[0];
  }

  // 계승자: 이 조우를 이기면 직전 조우의 인장도 가져온다
  gs.encounters.forEach((e, i) => {
    if (i === 0 || !e.winner || e.discarded) return;
    if (e.cards[e.winner].tokens.includes('successor') && !gs.encounters[i - 1].discarded) gs.encounters[i - 1].winner = e.winner;
  });

  const totals: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const e of gs.encounters) {
    for (const pc of Object.values(e.cards)) pc.signets = 0;
    if (!e.winner) continue;
    const win = e.cards[e.winner];
    let n = 1;
    // 재무관: 이 조우의 승리 카드에 인장 하나 더 (상대 카드일 수도 있다)
    if (Object.values(e.cards).some((pc) => pc.tokens.includes('treasurer'))) n++;
    if (win.tokens.includes('aristocrat')) n++;
    win.signets = n;
    totals[e.winner] += n;
  }
  for (const id of ids) gs.signets[id] = Math.max(0, totals[id] - (gs.signetPenalty[id] ?? 0));
}

function endGame(gs: CardiaGameState, winner: string | null, reason: string) {
  gs.phase = 'game_over';
  gs.winner = winner;
  gs.winnerReason = reason;
  gs.choice = null;
}

function draw(gs: CardiaGameState, playerId: string, n: number) {
  const p = gs.players[playerId];
  for (let i = 0; i < n && p.deck.length; i++) p.hand.push(p.deck.shift()!);
}

function discardFromHand(gs: CardiaGameState, playerId: string, card: number) {
  const p = gs.players[playerId];
  const at = p.hand.indexOf(card);
  if (at === -1) return;
  p.hand.splice(at, 1);
  p.discardPile.push(card);
}

function discardRandomFromHand(gs: CardiaGameState, playerId: string) {
  const hand = gs.players[playerId].hand;
  if (hand.length) discardFromHand(gs, playerId, hand[Math.floor(Math.random() * hand.length)]);
}

function bazaarCheck(gs: CardiaGameState) {
  if (gs.location?.id !== 'bazaar') return;
  for (const id of Object.keys(gs.players)) {
    if (gs.players[id].hand.length <= 1) draw(gs, id, 4);
  }
}

// ===================================================================
// 카드 내기 · 공개
// ===================================================================

export function playCard(gs: CardiaGameState, playerId: string, card: number, names: (id: string) => string): CardiaGameState {
  if (gs.choice) throw new IllegalAction('능력 선택이 끝날 때까지 기다리세요.');
  if (gs.pending[playerId] !== undefined) throw new IllegalAction('이미 이번 조우에 카드를 냈습니다.');
  if (gs.pendingBottom.includes(playerId)) throw new IllegalAction('먼저 손패 한 장을 덱 밑에 넣으세요.');
  const opp = opponentOf(gs, playerId);
  if (gs.playsFirst === opp && gs.pending[opp] === undefined) throw new IllegalAction('점쟁이 효과: 상대가 먼저 카드를 냅니다.');
  const me = gs.players[playerId];
  const at = me.hand.indexOf(card);
  if (at === -1) throw new IllegalAction('손에 없는 카드입니다.');

  me.hand.splice(at, 1);
  gs.pending[playerId] = card;
  if (gs.pending[opp] === undefined) return gs;
  return reveal(gs, names);
}

function reveal(gs: CardiaGameState, names: (id: string) => string): CardiaGameState {
  const ids = Object.keys(gs.players);
  const prev = gs.encounters[gs.encounters.length - 1];
  const enc: CardiaEncounter = { cards: {}, winner: null, forcedWinner: null, discarded: false };
  for (const id of ids) {
    const card = gs.pending[id];
    enc.cards[id] = {
      card,
      modifiers: gs.nextModifiers[id] ?? [],
      tokens: [],
      faction: cardOf(gs, card).faction,
      signets: 0,
    };
    gs.nextModifiers[id] = [];
  }
  gs.encounters.push(enc);
  const encIndex = gs.encounters.length - 1;
  gs.pending = {};
  gs.playsFirst = null;

  // 장소: 공개 시점 효과
  if (prev && !prev.discarded && gs.location) {
    if (gs.location.id === 'auction-house') {
      for (const id of ids) {
        if (cardOf(gs, enc.cards[id].card).influence < cardOf(gs, prev.cards[id].card).influence) {
          const top = gs.players[id].deck.shift();
          if (top !== undefined) gs.players[id].discardPile.push(top);
        }
      }
    }
    if (gs.location.id === 'haunted-catacombs') {
      const losers = ids.filter((id) => enc.cards[id].faction === prev.cards[id].faction);
      if (losers.length === 2) {
        recompute(gs);
        endGame(gs, null, '둘 다 같은 세력의 카드를 공개 (유령 지하묘지)');
        return gs;
      }
      if (losers.length === 1) {
        recompute(gs);
        endGame(gs, opponentOf(gs, losers[0]), `${names(losers[0])}이(가) 같은 세력의 카드를 공개 (유령 지하묘지)`);
        return gs;
      }
    }
  }

  recompute(gs);
  const [a, b] = ids.map((id) => cardOf(gs, enc.cards[id].card));
  const winner = enc.winner;
  log(gs, `조우 ${encIndex + 1}: ${names(ids[0])} ${a.name}(${effectiveInfluence(gs, enc.cards[ids[0]])}) vs ${names(ids[1])} ${b.name}(${effectiveInfluence(gs, enc.cards[ids[1]])}) → ${winner ? `${names(winner)} 승리` : '무승부'}`);

  // 진 카드의 능력 발동 (무승부면 없음)
  if (winner) {
    const loser = opponentOf(gs, winner);
    activate(gs, loser, cardOf(gs, enc.cards[loser].card).name, encIndex, names);
  }
  if (!gs.choice) finishRound(gs, names);
  return gs;
}

// ===================================================================
// 능력
// ===================================================================

/** 복사(환술사·마기스트라)할 수 없는 능력 */
const COPY_ABILITIES = ['Illusionist', 'Magistra'];

function ask(gs: CardiaGameState, c: Omit<CardiaChoice, 'picks' | 'remaining'> & Partial<Pick<CardiaChoice, 'picks' | 'remaining'>>) {
  gs.choice = { picks: [], remaining: 0, ...c };
}

/** 선택 가능한 카드 목록 */
export function choiceTargets(gs: CardiaGameState, choice: CardiaChoice): { enc: number; side: string }[] {
  const all = cardsInPlay(gs);
  const own = (c: { side: string }) => c.side === choice.owner;
  switch (choice.ability) {
    case 'Void Mage':
      return all.filter((c) => c.pc.modifiers.length || c.pc.tokens.length);
    case 'Inventor':
      return all.filter((c) => !choice.picks.some((p) => p.enc === c.enc && p.side === c.side));
    case 'Kinesis Mage':
      return choice.picks.length === 0
        ? all.filter((c) => own(c) && (c.pc.modifiers.length || c.pc.tokens.length))
        : all.filter((c) => own(c) && !(c.enc === choice.picks[0].enc && c.side === choice.picks[0].side));
    case 'Illusionist':
    case 'Magistra': {
      const wantOwn = choice.ability === 'Magistra';
      return all.filter((c) => {
        const card = cardOf(gs, c.pc.card);
        if (own(c) !== wantOwn || card.abilityType !== 'instant' || COPY_ABILITIES.includes(card.name)) return false;
        return !(c.enc === choice.encIndex && c.side === choice.owner);
      });
    }
    default:
      return all;
  }
}

function activate(gs: CardiaGameState, owner: string, name: string, encIndex: number, names: (id: string) => string) {
  const opp = opponentOf(gs, owner);
  const enc = gs.encounters[encIndex];
  const mine = enc.cards[owner];
  const prev = gs.encounters[encIndex - 1];
  const who = names(owner);
  log(gs, `${who}: ${name} 능력 발동`);

  switch (name) {
    // ── Deck I ──
    case 'Hired Blade':
      enc.discarded = true;
      for (const [id, pc] of Object.entries(enc.cards)) gs.players[id].discardPile.push(pc.card);
      break;
    case 'Void Mage':
      ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'card', prompt: '수정치나 토큰을 없앨 카드를 고르세요.' });
      break;
    case 'Surgeon':
      gs.nextModifiers[owner].push(-5);
      break;
    case 'Mediator':
      mine.tokens.push('mediator');
      break;
    case 'Saboteur':
      for (let i = 0; i < 2; i++) {
        const top = gs.players[opp].deck.shift();
        if (top !== undefined) gs.players[opp].discardPile.push(top);
      }
      break;
    case 'Fortune Teller':
      gs.playsFirst = opp;
      break;
    case 'Palace Guard':
      if (gs.players[opp].hand.length) ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'hand', remaining: 1, prompt: '상대 손패에서 버릴 카드를 고르세요.' });
      break;
    case 'Judge':
      mine.tokens.push('judge');
      break;
    case 'Ambusher':
      ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'faction', prompt: '세력을 고르세요. 상대는 그 세력의 손패를 모두 버립니다.' });
      break;
    case 'Puppeteer': {
      const hand = gs.players[opp].hand;
      if (!hand.length) break;
      const old = enc.cards[opp];
      gs.players[opp].discardPile.push(old.card);
      const pick = hand.splice(Math.floor(Math.random() * hand.length), 1)[0];
      enc.cards[opp] = { card: pick, modifiers: [], tokens: [], faction: cardOf(gs, pick).faction, signets: 0 };
      log(gs, `상대 카드가 ${cardOf(gs, pick).name}(으)로 바뀌었습니다.`);
      break;
    }
    case 'Clockmaker':
      if (prev && !prev.discarded) prev.cards[owner].modifiers.push(3);
      gs.nextModifiers[owner].push(3);
      break;
    case 'Revolutionary':
      if (gs.players[opp].hand.length) ask(gs, { playerId: opp, owner, ability: name, encIndex, kind: 'hand', remaining: 1, prompt: '손패에서 버릴 카드 1장을 고르세요.' });
      break;
    case 'Swamp Guardian':
      mine.tokens.push('swamp');
      break;
    case 'Treasurer':
      mine.tokens.push('treasurer');
      break;
    case 'Inventor':
      ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'card', prompt: '+3을 줄 카드를 고르세요.' });
      break;
    case 'Djinn':
    case 'Mechanical Djinn':
      recompute(gs);
      endGame(gs, owner, `${name} 능력으로 즉시 승리`);
      return;

    // ── Deck II ──
    case 'Aristocrat':
      mine.tokens.push('aristocrat');
      break;
    case 'Librarian':
      draw(gs, owner, 2);
      break;
    case 'Elemental':
      ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'card', prompt: '세력을 바꿀 카드를 고르세요.' });
      break;
    case 'Successor':
      mine.tokens.push('successor');
      break;
    case 'Tax Collector':
      recompute(gs);
      if (gs.signets[opp] > 0) gs.signetPenalty[opp] = (gs.signetPenalty[opp] ?? 0) + 1;
      break;
    case 'Poisoner':
      enc.cards[opp].modifiers.push(-3);
      break;
    case 'Engineer':
      ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'card', prompt: '+3을 줄 카드를 고르세요.' });
      break;
    case 'Counselor':
      if (prev && !prev.discarded) prev.forcedWinner = owner;
      break;
    case 'Blackmailer': {
      const n = Math.min(2, gs.players[opp].hand.length);
      if (n) ask(gs, { playerId: opp, owner, ability: name, encIndex, kind: 'hand', remaining: n, prompt: `손패에서 버릴 카드 ${n}장을 고르세요.` });
      break;
    }
    case 'Envoy':
      ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'card', prompt: '+5를 줄 카드를 고르세요.' });
      break;
    case 'Illusionist':
      ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'card', prompt: '복사할 상대 카드를 고르세요 (즉시 능력만).' });
      break;
    case 'Kinesis Mage':
      ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'card', prompt: '수정치·토큰을 옮길 내 카드를 고르세요.' });
      break;
    case 'Prodigy':
      mine.modifiers.push(5);
      break;
    case 'Magistra':
      ask(gs, { playerId: owner, owner, ability: name, encIndex, kind: 'card', prompt: '복사할 내 카드를 고르세요 (즉시 능력만).' });
      break;
  }

  // 고를 대상이 없으면 능력은 아무 효과 없이 끝난다
  if (gs.choice && gs.choice.kind === 'card' && choiceTargets(gs, gs.choice).length === 0) {
    log(gs, '고를 수 있는 카드가 없어 효과가 없습니다.');
    gs.choice = null;
  }
  recompute(gs);
}

export type CardiaChoiceAction =
  | { type: 'choose_card'; enc: number; side: string }
  | { type: 'choose_faction'; faction: CardiaFaction }
  | { type: 'choose_hand'; card: number }
  | { type: 'choose_option'; option: 'modifiers' | 'tokens' };

const FACTIONS: CardiaFaction[] = ['rebellion', 'academy', 'guild', 'dynasty'];

export function resolveChoice(gs: CardiaGameState, playerId: string, action: CardiaChoiceAction, names: (id: string) => string): CardiaGameState {
  const c = gs.choice;
  if (!c) throw new IllegalAction('지금은 고를 것이 없습니다.');
  if (c.playerId !== playerId) throw new IllegalAction('상대의 선택을 기다리세요.');
  const kindOf: Record<CardiaChoiceAction['type'], CardiaChoice['kind']> = {
    choose_card: 'card',
    choose_faction: 'faction',
    choose_hand: 'hand',
    choose_option: 'option',
  };
  if (kindOf[action.type] !== c.kind) throw new IllegalAction('지금은 그것을 고를 수 없습니다.');
  const opp = opponentOf(gs, c.owner);

  if (action.type === 'choose_card') {
    if (!choiceTargets(gs, c).some((t) => t.enc === action.enc && t.side === action.side)) throw new IllegalAction('고를 수 없는 카드입니다.');
    const pc = gs.encounters[action.enc].cards[action.side];
    const pick = { enc: action.enc, side: action.side };
    switch (c.ability) {
      case 'Void Mage':
      case 'Elemental':
        c.picks = [pick];
        c.kind = c.ability === 'Void Mage' ? 'option' : 'faction';
        c.prompt = c.ability === 'Void Mage' ? '수정치와 토큰 중 무엇을 없앨까요?' : '바꿀 세력을 고르세요.';
        return gs;
      case 'Inventor':
        if (!c.picks.length) {
          pc.modifiers.push(3);
          c.picks = [pick];
          c.prompt = '-3을 줄 다른 카드를 고르세요.';
          recompute(gs);
          return gs;
        }
        pc.modifiers.push(-3);
        break;
      case 'Engineer':
        pc.modifiers.push(3);
        break;
      case 'Envoy':
        pc.modifiers.push(5);
        break;
      case 'Kinesis Mage': {
        if (!c.picks.length) {
          c.picks = [pick];
          c.prompt = '옮겨 받을 내 다른 카드를 고르세요.';
          return gs;
        }
        const from = gs.encounters[c.picks[0].enc].cards[c.picks[0].side];
        pc.modifiers.push(...from.modifiers);
        pc.tokens.push(...from.tokens);
        from.modifiers = [];
        from.tokens = [];
        break;
      }
      case 'Illusionist':
      case 'Magistra': {
        gs.choice = null;
        activate(gs, c.owner, cardOf(gs, pc.card).name, c.encIndex, names);
        if (gs.phase === 'game_over' || gs.choice) return gs;
        break;
      }
    }
  } else if (action.type === 'choose_faction') {
    if (!FACTIONS.includes(action.faction)) throw new IllegalAction('잘못된 세력입니다.');
    if (c.ability === 'Ambusher') {
      const hand = gs.players[opp].hand;
      const drop = hand.filter((card) => cardOf(gs, card).faction === action.faction);
      for (const card of drop) discardFromHand(gs, opp, card);
      log(gs, `${names(opp)}이(가) ${action.faction} 카드 ${drop.length}장을 버렸습니다.`);
    } else {
      const p = c.picks[0];
      gs.encounters[p.enc].cards[p.side].faction = action.faction;
    }
  } else if (action.type === 'choose_option') {
    if (action.option !== 'modifiers' && action.option !== 'tokens') throw new IllegalAction('잘못된 선택입니다.');
    const p = c.picks[0];
    const pc = gs.encounters[p.enc].cards[p.side];
    if (action.option === 'modifiers') pc.modifiers = [];
    else pc.tokens = [];
  } else if (action.type === 'choose_hand') {
    // 궁정 경비병은 능력 사용자가 상대 손패에서, 혁명가·협박꾼은 상대가 자기 손패에서 고른다
    const target = c.ability === 'Palace Guard' ? opp : c.playerId;
    if (!gs.players[target].hand.includes(action.card)) throw new IllegalAction('그 손패에 없는 카드입니다.');
    discardFromHand(gs, target, action.card);
    log(gs, `${names(target)}이(가) ${cardOf(gs, action.card).name}을(를) 버렸습니다.`);
    c.remaining--;
    if (c.remaining > 0 && gs.players[target].hand.length) return gs;
  }

  if (gs.choice === c) gs.choice = null;
  recompute(gs);
  if (!gs.choice && gs.phase === 'playing') finishRound(gs, names);
  return gs;
}

// ===================================================================
// 라운드 마무리
// ===================================================================

function finishRound(gs: CardiaGameState, names: (id: string) => string) {
  if (gs.phase !== 'playing') return;
  recompute(gs);
  const ids = Object.keys(gs.players);
  const encIndex = gs.encounters.length - 1;
  const current = gs.encounters[encIndex];

  // 장소: 뱀 신전 — 이긴 쪽은 1장 뽑고 상대는 1장(무작위) 버린다
  if (gs.location?.id === 'serpent-temple' && current?.winner) {
    draw(gs, current.winner, 1);
    discardRandomFromHand(gs, opponentOf(gs, current.winner));
  }

  // 장소: 건국 기념일 — 3연속 승리
  if (gs.location?.id === 'founders-day' && encIndex >= 2) {
    const last3 = gs.encounters.slice(-3).map((e) => e.winner);
    if (last3[0] && last3.every((w) => w === last3[0])) {
      endGame(gs, last3[0], '3연속 조우 승리 (건국 기념일)');
      return;
    }
  }

  // 인장 5개 이상이면서 상대보다 많으면 승리 (같으면 계속)
  const [s1, s2] = ids.map((id) => gs.signets[id]);
  if (Math.max(s1, s2) >= WIN_SIGNETS && s1 !== s2) {
    endGame(gs, s1 > s2 ? ids[0] : ids[1], `인장 ${Math.max(s1, s2)}개 획득`);
    return;
  }

  // 카드 뽑기
  const loc = gs.location?.id;
  const base = loc === 'bazaar' ? 0 : loc === 'grand-library' || loc === 'scrapyard' ? 2 : 1;
  for (const id of ids) {
    const extra = cardsInPlay(gs).filter((c) => c.side === id && c.pc.tokens.includes('swamp')).length;
    draw(gs, id, base + extra);
  }
  bazaarCheck(gs);
  // 가정: 손패가 1장뿐이면 덱 밑에 넣지 않는다 (넣으면 낼 카드가 없어지므로)
  gs.pendingBottom = loc === 'scrapyard' ? ids.filter((id) => gs.players[id].hand.length > 1) : [];

  // 낼 카드가 없으면 패배
  const stuck = ids.filter((id) => gs.players[id].hand.length === 0);
  if (stuck.length === 2 || gs.encounters.length >= gs.maxRounds) {
    endGame(gs, s1 === s2 ? null : s1 > s2 ? ids[0] : ids[1], '더 낼 카드가 없음 — 인장 수로 판정');
  } else if (stuck.length === 1) {
    endGame(gs, opponentOf(gs, stuck[0]), `${names(stuck[0])}이(가) 낼 카드가 없음`);
  }
}

/** 폐차장: 손패 한 장을 덱 밑에 넣는다 */
export function putOnBottom(gs: CardiaGameState, playerId: string, card: number): CardiaGameState {
  if (!gs.pendingBottom.includes(playerId)) throw new IllegalAction('지금은 덱 밑에 카드를 넣을 수 없습니다.');
  const p = gs.players[playerId];
  const at = p.hand.indexOf(card);
  if (at === -1) throw new IllegalAction('손에 없는 카드입니다.');
  p.hand.splice(at, 1);
  p.deck.push(card);
  gs.pendingBottom = gs.pendingBottom.filter((id) => id !== playerId);
  return gs;
}
