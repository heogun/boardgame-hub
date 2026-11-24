import type { RenderContext } from '../../framework/types';
import type { CardiaEncounter, CardiaFaction, CardiaGameState, CardiaPlayedCard, CardiaToken } from './types';
import { cardOf, choiceTargets, effectiveInfluence, type CardiaChoiceAction } from './game';

export type CardiaAction =
  | { type: 'play'; card: number }
  /** 폐차장: 손패 한 장을 덱 밑에 넣는다 */
  | { type: 'bottom'; card: number }
  | CardiaChoiceAction;
type Ctx = RenderContext<CardiaAction, Record<string, never>>;

/** view 에서 가린 카드 값 */
export const HIDDEN_CARD = -1;

const FACTIONS: CardiaFaction[] = ['rebellion', 'academy', 'guild', 'dynasty'];

const FACTION_EMOJI: Record<CardiaFaction, string> = {
  rebellion: '⚔️',
  academy: '📚',
  guild: '⚙️',
  dynasty: '👑',
};

const TOKEN_LABEL: Record<CardiaToken, string> = {
  mediator: '⚖️중재',
  judge: '🔨판사',
  swamp: '🐸늪',
  treasurer: '💰재무',
  aristocrat: '🎩귀족',
  successor: '👣계승',
};

function cardFace(gs: CardiaGameState, index: number, opts: { attrs?: string; interactive?: boolean; highlight?: boolean } = {}): string {
  if (index === HIDDEN_CARD) {
    return `<div class="w-24 h-32 rounded-xl border border-indigo-500/40 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-2xl text-indigo-300/60">?</div>`;
  }
  const card = cardOf(gs, index);
  return `
    <button type="button" ${opts.attrs ?? ''} ${opts.interactive ? '' : 'disabled'} title="${card.ability}"
      class="w-24 h-32 rounded-xl border p-2 flex flex-col text-left transition-all
        ${opts.highlight ? 'border-amber-400 bg-amber-500/10' : 'border-slate-600 bg-slate-800'}
        ${opts.interactive ? 'hover:border-indigo-400 hover:-translate-y-1 cursor-pointer' : 'cursor-default'}">
      <span class="text-xl font-black text-indigo-200">${card.influence}</span>
      <span class="text-[11px] font-bold leading-tight mt-1">${card.name}</span>
      <span class="text-[9px] leading-tight text-slate-400 mt-1 line-clamp-3">${card.abilityType === 'ongoing' ? '⏳ ' : ''}${card.ability}</span>
      <span class="text-[10px] text-slate-400 mt-auto">${FACTION_EMOJI[card.faction]} ${card.faction}</span>
    </button>
  `;
}

/** 조우 기록의 카드 한 장 (작게) */
function playedChip(gs: CardiaGameState, pc: CardiaPlayedCard, enc: number, side: string, e: CardiaEncounter, selectable: boolean, picked: boolean): string {
  const card = cardOf(gs, pc.card);
  const eff = effectiveInfluence(gs, pc);
  const mods = pc.modifiers.length ? pc.modifiers.map((m) => (m > 0 ? `+${m}` : `${m}`)).join(' ') : '';
  const won = e.winner === side;
  return `
    <button type="button" data-enc="${enc}" data-side="${side}" ${selectable ? '' : 'disabled'} title="${card.name}: ${card.ability}"
      class="w-20 rounded-lg border px-1.5 py-1 text-left text-[10px] leading-tight
        ${e.discarded ? 'opacity-40 line-through border-slate-700' : won ? 'border-amber-400 bg-amber-500/10' : 'border-slate-700 bg-slate-800/70'}
        ${selectable ? 'ring-2 ring-indigo-400 cursor-pointer hover:bg-indigo-500/20' : ''} ${picked ? 'ring-2 ring-emerald-400' : ''}">
      <div class="flex justify-between"><b class="text-sm ${eff !== card.influence ? 'text-emerald-300' : 'text-indigo-200'}">${eff}</b><span>${'★'.repeat(pc.signets)}</span></div>
      <div class="truncate">${card.name}</div>
      <div class="text-slate-500">${FACTION_EMOJI[pc.faction]}${mods ? ` <span class="text-emerald-400">${mods}</span>` : ''}</div>
      ${pc.tokens.length ? `<div class="text-amber-300">${pc.tokens.map((t) => TOKEN_LABEL[t]).join(' ')}</div>` : ''}
    </button>`;
}

export function renderCardia(container: HTMLElement, gs: CardiaGameState, ctx: Ctx) {
  const ids = Object.keys(gs.players);
  const meId = ids.includes(ctx.myId) ? ctx.myId : ids[0];
  const oppId = ids.find((id) => id !== meId)!;
  const me = gs.players[meId];
  const opp = gs.players[oppId];
  const playing = gs.phase === 'playing' && !ctx.isSpectator;
  const choice = gs.choice;
  const myChoice = playing && choice?.playerId === ctx.myId ? choice : null;
  const mustBottom = playing && gs.pendingBottom.includes(meId);
  const waitFirst = gs.playsFirst === oppId && gs.pending[oppId] === undefined;
  const canPlay = playing && !choice && !mustBottom && gs.pending[meId] === undefined && !waitFirst;
  const targets = myChoice?.kind === 'card' ? choiceTargets(gs, myChoice) : [];
  const isTarget = (enc: number, side: string) => targets.some((t) => t.enc === enc && t.side === side);
  const isPicked = (enc: number, side: string) => !!myChoice?.picks.some((p) => p.enc === enc && p.side === side);

  const status = (() => {
    if (gs.phase !== 'playing') return '';
    if (choice) return choice.playerId === ctx.myId ? '' : `${ctx.playerName(choice.playerId)}이(가) ${choice.ability} 능력을 처리하는 중…`;
    if (mustBottom) return '폐차장: 손패 한 장을 눌러 덱 밑에 넣으세요.';
    if (gs.pending[meId] !== undefined) return '상대를 기다리는 중…';
    if (waitFirst) return '점쟁이 효과: 상대가 먼저 앞면으로 카드를 냅니다.';
    if (gs.playsFirst === meId) return '점쟁이 효과: 내 카드가 먼저 앞면으로 공개됩니다.';
    return ctx.isSpectator ? '' : '아래에서 낼 카드를 고르세요.';
  })();

  container.innerHTML = `
    <div class="p-4 flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span>${gs.deckType === 'deck2' ? 'Deck II' : 'Deck I'}</span>
        ${gs.location ? `<span class="text-sky-300" title="${gs.location.ability}">📍 ${gs.location.name}</span>` : ''}
        <span>조우 ${gs.encounters.length}</span>
        <span class="text-amber-300">${ctx.isSpectator ? ctx.playerName(meId) : '나'} ${gs.signets[meId] ?? 0} 인장</span>
        <span class="text-amber-300">${ctx.playerName(oppId)} ${gs.signets[oppId] ?? 0} 인장</span>
        <span class="text-slate-500">5개 이상 + 상대보다 많으면 승리</span>
      </div>
      ${gs.location ? `<p class="text-[11px] text-sky-300/80 -mt-2">${gs.location.ability}</p>` : ''}

      ${
        gs.encounters.length
          ? `<div class="flex gap-2 overflow-x-auto pb-1">
          ${gs.encounters
            .map(
              (e, i) => `<div class="flex flex-col items-center gap-1 shrink-0">
                ${playedChip(gs, e.cards[oppId], i, oppId, e, isTarget(i, oppId), isPicked(i, oppId))}
                <span class="text-[10px] text-slate-500">#${i + 1}${e.forcedWinner ? ' 🎓' : ''}</span>
                ${playedChip(gs, e.cards[meId], i, meId, e, isTarget(i, meId), isPicked(i, meId))}
              </div>`,
            )
            .join('')}
        </div>`
          : ''
      }

      ${myChoice ? renderChoice(gs, myChoice.kind, myChoice.prompt, myChoice.ability, opp.hand) : ''}

      <div class="grid grid-cols-2 gap-4 items-start">
        <div class="flex flex-col items-center gap-2">
          <span class="text-xs text-slate-400">${ctx.playerName(oppId)} · 손패 ${opp.hand.length} · 덱 ${opp.deck.length} · 버림 ${opp.discardPile.length}</span>
          ${gs.pending[oppId] !== undefined ? cardFace(gs, gs.pending[oppId]) : '<div class="w-24 h-32 rounded-xl border border-dashed border-slate-700"></div>'}
          <span class="text-[11px] text-slate-500">${gs.pending[oppId] !== undefined ? '카드를 냈습니다' : gs.phase === 'playing' ? '고르는 중…' : ''}</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <span class="text-xs text-slate-400">${ctx.isSpectator ? ctx.playerName(meId) : '나'} · 덱 ${me.deck.length} · 버림 ${me.discardPile.length}</span>
          ${gs.pending[meId] !== undefined ? cardFace(gs, gs.pending[meId]) : '<div class="w-24 h-32 rounded-xl border border-dashed border-slate-700"></div>'}
          <span class="text-[11px] text-slate-500">${status}</span>
        </div>
      </div>

      <div>
        <h3 class="text-xs font-bold text-slate-400 mb-2">${ctx.isSpectator ? `${ctx.playerName(meId)}의 손패` : '내 손패'}</h3>
        <div class="flex flex-wrap gap-2">
          ${me.hand.map((c) => cardFace(gs, c, { attrs: `data-card="${c}"`, interactive: canPlay || mustBottom || (myChoice?.kind === 'hand' && myChoice.ability !== 'Palace Guard') })).join('') || '<span class="text-xs text-slate-500">없음</span>'}
        </div>
      </div>

      ${gs.log.length ? `<div class="text-[11px] text-slate-500 flex flex-col gap-0.5">${gs.log.slice().reverse().map((l) => `<span>${l}</span>`).join('')}</div>` : ''}
    </div>
  `;

  container.querySelectorAll<HTMLButtonElement>('[data-card]:not([disabled])').forEach((btn) => {
    const card = Number(btn.dataset.card);
    btn.addEventListener('click', () => {
      if (myChoice?.kind === 'hand') ctx.dispatch({ type: 'choose_hand', card });
      else if (mustBottom) ctx.dispatch({ type: 'bottom', card });
      else ctx.dispatch({ type: 'play', card });
    });
  });
  container.querySelectorAll<HTMLButtonElement>('[data-opp-card]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.dispatch({ type: 'choose_hand', card: Number(btn.dataset.oppCard) }));
  });
  container.querySelectorAll<HTMLButtonElement>('[data-enc]:not([disabled])').forEach((btn) => {
    btn.addEventListener('click', () => ctx.dispatch({ type: 'choose_card', enc: Number(btn.dataset.enc), side: btn.dataset.side! }));
  });
  container.querySelectorAll<HTMLButtonElement>('[data-faction]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.dispatch({ type: 'choose_faction', faction: btn.dataset.faction as CardiaFaction }));
  });
  container.querySelectorAll<HTMLButtonElement>('[data-option]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.dispatch({ type: 'choose_option', option: btn.dataset.option as 'modifiers' | 'tokens' }));
  });
}

function renderChoice(gs: CardiaGameState, kind: string, prompt: string, ability: string, oppHand: number[]): string {
  const btn = 'px-3 py-1.5 rounded-lg text-xs bg-slate-700 hover:bg-slate-600 text-slate-100';
  let body = '';
  if (kind === 'card') body = '<p class="text-[11px] text-slate-400">위 조우 기록에서 테두리가 빛나는 카드를 누르세요.</p>';
  if (kind === 'faction') body = FACTIONS.map((f) => `<button data-faction="${f}" class="${btn}">${FACTION_EMOJI[f]} ${f}</button>`).join('');
  if (kind === 'option') body = `<button data-option="modifiers" class="${btn}">수정치 모두 제거</button><button data-option="tokens" class="${btn}">토큰 모두 제거</button>`;
  if (kind === 'hand') {
    body =
      ability === 'Palace Guard'
        ? oppHand.map((c) => cardFace(gs, c, { attrs: `data-opp-card="${c}"`, interactive: true })).join('')
        : '<p class="text-[11px] text-slate-400">아래 내 손패에서 카드를 누르세요.</p>';
  }
  return `
    <div class="rounded-xl border border-indigo-500/50 bg-indigo-500/10 p-3 flex flex-col gap-2">
      <p class="text-sm text-indigo-100"><b>${ability}</b> — ${prompt}</p>
      <div class="flex flex-wrap gap-2">${body}</div>
    </div>`;
}
