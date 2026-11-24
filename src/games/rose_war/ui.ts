import type { RenderContext } from '../../framework/types';
import { canMarch, groups, score, SIZE, target, type House, type MoveCard, type RoseWarAction, type RoseWarState } from './game';

/** view 에서 가린 카드 */
export const HIDDEN_CARD: MoveCard = { id: -1, dir: -1, dist: 0 };

export interface RoseWarLocal {
  /** 고른 카드 id */
  selected: number | null;
}
type Ctx = RenderContext<RoseWarAction, RoseWarLocal>;

const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
const HOUSE_NAME: Record<House, string> = { red: '붉은 가문', white: '흰 가문' };

function rose(house: House, flipped: boolean): string {
  const color = house === 'red' ? 'bg-rose-500 border-rose-300' : 'bg-slate-100 border-white';
  return `<span class="block w-7 h-7 rounded-full border-2 ${color} shadow ${flipped ? 'ring-2 ring-amber-300' : ''}"></span>`;
}

function cardHtml(card: MoveCard, opts: { playable: boolean; selected: boolean; interactive: boolean }): string {
  if (card.id === HIDDEN_CARD.id) {
    return `<div class="w-12 h-16 rounded-lg border border-emerald-700 bg-gradient-to-br from-emerald-900 to-slate-900"></div>`;
  }
  return `<button type="button" data-card="${card.id}" ${opts.interactive ? '' : 'disabled'}
    class="w-12 h-16 rounded-lg border flex flex-col items-center justify-center transition
      ${opts.selected ? 'border-amber-300 bg-amber-500/20 -translate-y-1' : 'border-slate-500 bg-slate-800'}
      ${opts.playable ? '' : 'opacity-40'} ${opts.interactive ? 'cursor-pointer hover:border-amber-300' : 'cursor-default'}">
    <span class="text-xl leading-none">${ARROWS[card.dir]}</span>
    <span class="text-sm font-bold mt-1">${card.dist}</span>
  </button>`;
}

export function renderRoseWar(container: HTMLElement, gs: RoseWarState, ctx: Ctx) {
  const meId = gs.order.includes(ctx.myId) ? ctx.myId : gs.order[0];
  const oppId = gs.order.find((id) => id !== meId)!;
  const me = gs.players[meId];
  const opp = gs.players[oppId];
  const myTurn = !ctx.isSpectator && !gs.over && gs.turn === ctx.myId;
  const local = ctx.local;

  const selCard = myTurn ? me.hand.find((c) => c.id === local.selected) : undefined;
  if (!selCard) local.selected = null;
  const dest = selCard && me.roses > 0 ? target(gs, selCard) : null;
  const flippedSet = new Set((gs.lastMove?.flipped ?? []).map(([r, c]) => `${r},${c}`));
  const mustPass = myTurn && !canMarch(gs, ctx.myId);

  const scoreLine = (id: string) => {
    const p = gs.players[id];
    const g = groups(gs, p.house);
    return `<div class="flex flex-col gap-0.5 text-xs">
      <div class="flex items-center gap-2 font-bold">${rose(p.house, false).replace('w-7 h-7', 'w-3 h-3')}
        ${ctx.playerName(id)} <span class="font-normal text-slate-400">(${HOUSE_NAME[p.house]})</span>
        ${gs.turn === id && !gs.over ? '<span class="text-emerald-300 font-normal">· 차례</span>' : ''}</div>
      <div class="text-slate-300">점수 <b class="text-amber-300">${score(gs, p.house)}</b>
        <span class="text-slate-500">· 무리 ${g.length ? g.join(', ') : '-'}</span></div>
      <div class="text-slate-500">남은 장미 ${p.roses} · 재집결 ${p.rallies}회 · 손패 ${p.hand.length}</div>
    </div>`;
  };

  container.innerHTML = `
    <div class="p-4 flex flex-col gap-4 items-center">
      <div class="w-full max-w-xl grid grid-cols-2 gap-3">${scoreLine(meId)}${scoreLine(oppId)}</div>
      ${gs.lastAction ? `<p class="text-xs text-slate-400">${gs.lastAction}</p>` : ''}

      <div class="flex flex-col items-center gap-1">
        <div class="flex gap-1">${opp.hand.map((c) => cardHtml(c, { playable: true, selected: false, interactive: false })).join('')}</div>
        <span class="text-[11px] text-slate-500">${ctx.playerName(oppId)}의 손패</span>
      </div>

      <div class="grid gap-1 p-2 rounded-xl bg-emerald-950/60 border border-emerald-800" style="grid-template-columns: repeat(${SIZE}, minmax(0, 1fr))">
        ${gs.board
          .map((row, r) =>
            row
              .map((cell, c) => {
                const isBanner = gs.banner[0] === r && gs.banner[1] === c;
                const isDest = dest && dest[0] === r && dest[1] === c;
                const isLast = gs.lastMove && gs.lastMove.to[0] === r && gs.lastMove.to[1] === c;
                return `<div ${isDest ? 'data-dest="1"' : ''} class="relative w-10 h-10 sm:w-12 sm:h-12 rounded-md flex items-center justify-center
                  ${isDest ? 'bg-amber-400/40 ring-2 ring-amber-300 cursor-pointer' : 'bg-emerald-900/70'} ${isLast ? 'ring-1 ring-sky-300' : ''}">
                  ${cell ? rose(cell, flippedSet.has(`${r},${c}`)) : ''}
                  ${isBanner ? '<span class="absolute -top-1 -right-1 text-base drop-shadow">🚩</span>' : ''}
                </div>`;
              })
              .join(''),
          )
          .join('')}
      </div>

      <div class="flex flex-col items-center gap-2">
        <div class="flex gap-1">
          ${me.hand
            .map((c) => cardHtml(c, { playable: !!target(gs, c) && me.roses > 0, selected: c.id === local.selected, interactive: myTurn }))
            .join('')}
        </div>
        <span class="text-[11px] text-slate-500">${ctx.isSpectator ? `${ctx.playerName(meId)}의 손패` : '내 손패'} · 덱 ${gs.deck.length} · 버림 ${gs.discard.length}</span>
        ${
          myTurn
            ? `<p class="text-xs text-slate-300">${
                mustPass
                  ? '낼 수 있는 카드가 없습니다. 재집결하거나 대기하세요.'
                  : selCard
                    ? dest
                      ? '빛나는 칸을 누르면 그곳으로 진군해 장미를 심습니다.'
                      : '이 카드로는 갈 수 없습니다 (정원 밖 또는 장미가 있는 칸).'
                    : '카드를 골라 깃발을 옮기세요. 이동한 줄에서 끼인 상대 장미는 뒤집힙니다.'
              }</p>
            <div class="flex gap-2">
              <button id="rw-rally" ${me.rallies > 0 ? '' : 'disabled'} class="px-3 py-1.5 rounded-lg text-xs bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-40">재집결 (${me.rallies})</button>
              <button id="rw-pass" ${mustPass ? '' : 'disabled'} class="px-3 py-1.5 rounded-lg text-xs bg-slate-600 hover:bg-slate-500 text-white disabled:opacity-40">대기</button>
            </div>`
            : gs.over
              ? ''
              : `<p class="text-xs text-slate-400">${ctx.playerName(gs.turn)}의 차례를 기다리는 중…</p>`
        }
      </div>

      <details class="w-full max-w-xl text-[11px] text-slate-400">
        <summary class="cursor-pointer">규칙</summary>
        <ul class="list-disc pl-4 mt-1 space-y-0.5">
          <li>카드를 내 깃발을 화살표 방향으로 숫자만큼 옮기고, 도착한 빈 칸에 장미를 심습니다.</li>
          <li>돌격: 이동한 직선 위에서 새 장미와 내 장미 사이에 끼인 상대 장미를 모두 뒤집습니다.</li>
          <li>재집결: 손패를 버리고 4장을 새로 받습니다 (게임당 3번). 낼 카드가 없으면 대기합니다.</li>
          <li>둘 다 연달아 대기하거나 장미를 모두 심으면 끝. 이어진 무리마다 n(n+1)/2점.</li>
        </ul>
      </details>
    </div>
  `;

  if (!myTurn) return;
  container.querySelectorAll<HTMLButtonElement>('[data-card]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.card);
      local.selected = local.selected === id ? null : id;
      ctx.rerender();
    }),
  );
  container.querySelector('[data-dest]')?.addEventListener('click', () => {
    if (local.selected === null) return;
    const cardId = local.selected;
    local.selected = null;
    ctx.dispatch({ type: 'march', cardId });
  });
  container.querySelector('#rw-rally')?.addEventListener('click', () => {
    local.selected = null;
    ctx.dispatch({ type: 'rally' });
  });
  container.querySelector('#rw-pass')?.addEventListener('click', () => ctx.dispatch({ type: 'pass' }));
}
