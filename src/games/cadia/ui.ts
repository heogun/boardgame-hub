import type { RenderContext } from '../../framework/types';
import type { CardiaEncounter, CardiaGameState } from './types';
import { getCard } from './game';

export type CardiaAction = { type: 'play'; card: number };
type Ctx = RenderContext<CardiaAction, Record<string, never>>;

/** view 에서 가린 카드 값 */
export const HIDDEN_CARD = -1;

const FACTION_EMOJI: Record<string, string> = {
  rebellion: '⚔️',
  academy: '📚',
  guild: '⚙️',
  dynasty: '👑',
};

function cardFace(gs: CardiaGameState, index: number, opts: { interactive?: boolean; winner?: boolean } = {}): string {
  if (index === HIDDEN_CARD) {
    return `<div class="w-24 h-32 rounded-xl border border-indigo-500/40 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-2xl text-indigo-300/60">?</div>`;
  }
  const card = getCard(index + 1, gs.deckType);
  return `
    <button type="button" data-card="${index}" ${opts.interactive ? '' : 'disabled'} title="${card.ability}"
      class="w-24 h-32 rounded-xl border p-2 flex flex-col text-left transition-all
        ${opts.winner ? 'border-amber-400 bg-amber-500/10' : 'border-slate-600 bg-slate-800'}
        ${opts.interactive ? 'hover:border-indigo-400 hover:-translate-y-1 cursor-pointer' : 'cursor-default'}">
      <span class="text-xl font-black text-indigo-200">${card.influence}</span>
      <span class="text-[11px] font-bold leading-tight mt-1">${card.name}</span>
      <span class="text-[10px] text-slate-400 mt-auto">${FACTION_EMOJI[card.faction] ?? ''} ${card.faction}</span>
    </button>
  `;
}

function renderEncounter(gs: CardiaGameState, enc: CardiaEncounter, ids: string[], ctx: Ctx): string {
  const mine = ids[0] === ctx.myId ? 0 : 1;
  const sides = [
    { card: enc.player1Card, win: enc.player1Signet },
    { card: enc.player2Card, win: enc.player2Signet },
  ];
  const ordered = mine === 0 ? sides : [sides[1], sides[0]];
  return `
    <div class="flex items-center gap-1 text-xs shrink-0">
      <span class="px-2 py-1 rounded ${ordered[0].win ? 'bg-amber-500/20 text-amber-200' : 'bg-slate-800 text-slate-400'}">${getCard(ordered[0].card + 1, gs.deckType).influence}</span>
      <span class="text-slate-600">vs</span>
      <span class="px-2 py-1 rounded ${ordered[1].win ? 'bg-amber-500/20 text-amber-200' : 'bg-slate-800 text-slate-400'}">${getCard(ordered[1].card + 1, gs.deckType).influence}</span>
    </div>
  `;
}

export function renderCardia(container: HTMLElement, gs: CardiaGameState, ctx: Ctx) {
  const ids = Object.keys(gs.players);
  const meId = ids.includes(ctx.myId) ? ctx.myId : ids[0];
  const oppId = ids.find((id) => id !== meId)!;
  const me = gs.players[meId];
  const myPending = gs.pending[meId];
  const oppPending = gs.pending[oppId];
  const canPlay = !ctx.isSpectator && gs.phase === 'playing' && myPending === undefined;
  const last = gs.encounters[gs.encounters.length - 1];

  container.innerHTML = `
    <div class="p-4 flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span>${gs.deckType === 'deck2' ? 'Deck II' : 'Deck I'}${gs.location ? ` · ${gs.location.name}` : ''}</span>
        <span>조우 ${gs.encounters.length} / ${gs.maxRounds}</span>
        <span class="text-amber-300">${ctx.playerName(meId)} ${gs.signets[meId] ?? 0} 인장</span>
        <span class="text-amber-300">${ctx.playerName(oppId)} ${gs.signets[oppId] ?? 0} 인장</span>
      </div>

      ${gs.encounters.length ? `<div class="flex gap-3 overflow-x-auto pb-1">${gs.encounters.map((e) => renderEncounter(gs, e, ids, ctx)).join('')}</div>` : ''}

      <div class="grid grid-cols-2 gap-4 items-start">
        <div class="flex flex-col items-center gap-2">
          <span class="text-xs text-slate-400">${ctx.playerName(oppId)} · 손패 ${gs.players[oppId].hand.length} · 덱 ${gs.players[oppId].deck.length}</span>
          ${oppPending !== undefined ? cardFace(gs, oppPending) : last ? cardFace(gs, ids[0] === oppId ? last.player1Card : last.player2Card, { winner: ids[0] === oppId ? last.player1Signet : last.player2Signet }) : '<div class="w-24 h-32 rounded-xl border border-dashed border-slate-700"></div>'}
          <span class="text-[11px] text-slate-500">${oppPending !== undefined ? '카드를 냈습니다' : gs.phase === 'playing' ? '고르는 중…' : ''}</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <span class="text-xs text-slate-400">${ctx.isSpectator ? ctx.playerName(meId) : '나'} · 덱 ${me.deck.length}</span>
          ${myPending !== undefined ? cardFace(gs, myPending) : last ? cardFace(gs, ids[0] === meId ? last.player1Card : last.player2Card, { winner: ids[0] === meId ? last.player1Signet : last.player2Signet }) : '<div class="w-24 h-32 rounded-xl border border-dashed border-slate-700"></div>'}
          <span class="text-[11px] text-slate-500">${myPending !== undefined ? '상대를 기다리는 중…' : gs.phase === 'playing' && !ctx.isSpectator ? '아래에서 낼 카드를 고르세요' : ''}</span>
        </div>
      </div>

      <div>
        <h3 class="text-xs font-bold text-slate-400 mb-2">${ctx.isSpectator ? `${ctx.playerName(meId)}의 손패` : '내 손패'}</h3>
        <div class="flex flex-wrap gap-2">
          ${me.hand.map((c) => cardFace(gs, c, { interactive: canPlay })).join('') || '<span class="text-xs text-slate-500">없음</span>'}
        </div>
      </div>
      <p class="text-[11px] text-slate-500">카드 위에 마우스를 올리면 능력이 보입니다. 능력 효과는 아직 자동 적용되지 않습니다.</p>
    </div>
  `;

  if (!canPlay) return;
  container.querySelectorAll<HTMLButtonElement>('[data-card]:not([disabled])').forEach((btn) => {
    btn.addEventListener('click', () => ctx.dispatch({ type: 'play', card: Number(btn.dataset.card) }));
  });
}
