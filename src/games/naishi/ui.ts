import type { RenderContext } from '../../framework/types';
import type { NaishiGameState, NaishiPlayerState, NaishiCard, NaishiZone } from './types';
import { calculateScore, canDeclareEnd, EMISSARIES_PER_PLAYER, type SwapKind } from './game';

export type NaishiAction =
  | { type: 'develop'; targetZone: NaishiZone; targetIndex: number }
  | { type: 'swap_positions'; zone: SwapKind; index1: number; index2: number }
  | { type: 'remove_from_river'; index1: number; index2: number }
  | { type: 'imperial_decree'; zone: NaishiZone; targetIndex: number }
  | { type: 'recall_emissaries' }
  | { type: 'declare_end' }
  | { type: 'end_turn' };

type Mode = 'develop' | 'swap' | 'river' | 'decree';
type Pick = { zone: NaishiZone | 'river'; index: number };

export interface NaishiLocal {
  mode: Mode;
  /** 교환·강 정리처럼 두 곳을 고르는 동안 첫 선택 */
  picks: Pick[];
}
type Ctx = RenderContext<NaishiAction, NaishiLocal>;

const CARD_INFO: Record<string, { emoji: string; name: string; hint: string }> = {
  mountain: { emoji: '⛰️', name: '산', hint: '1장뿐이면 +5, 아니면 장당 -5' },
  naishi: { emoji: '👑', name: '나이시', hint: '가운데(3번) 줄 12 / 손 8' },
  advisor: { emoji: '📜', name: '고문', hint: '위치별 2~4점, 인접 나이시당 +4' },
  fort: { emoji: '🏰', name: '요새', hint: '양 끝에 있으면 6점' },
  sentinel: { emoji: '🛡️', name: '파수꾼', hint: '인접 파수꾼 없으면 3점, 인접 요새당 +4' },
  torii: { emoji: '⛩️', name: '도리이', hint: '1장 -5 / 2장 0 / 3장 이상 30' },
  monk: { emoji: '🧘', name: '승려', hint: '손에 있으면 5점, 인접 도리이당 +2' },
  rice_field: { emoji: '🌾', name: '논', hint: '줄에 연속 2/3/4장: 10/20/30' },
  banner: { emoji: '🚩', name: '깃발', hint: '줄에 1장 3점, 2장 이상 8점' },
  horseman: { emoji: '🐎', name: '기마병', hint: '손에 있으면 3점, 같은 위치 줄에 깃발 +10' },
  ronin: { emoji: '⚔️', name: '낭인', hint: '서로 다른 종류 8/9/10+: 8/15/45' },
  ninja: { emoji: '🥷', name: '닌자', hint: '0점 (복사 능력 미구현)' },
};

const MODE_HELP: Record<Mode, string> = {
  develop: '개발: 내 줄 또는 손의 카드를 누르면, 같은 번호의 강 카드가 그 자리에 들어옵니다 (원래 카드는 버려짐).',
  swap: '교환(사절): 두 곳을 차례로 누르세요 — 줄 두 장, 손 두 장, 같은 번호의 손·줄, 또는 강 카드 두 장.',
  river: '강 정리(사절): 버릴 강 카드 두 장을 차례로 누르세요.',
  decree: '황제 칙령(사절, 게임에 한 번): 내 줄 또는 손 카드를 누르면 상대의 같은 위치 카드와 맞바꿉니다.',
};

function cardHtml(card: NaishiCard | null, attrs: string, opts: { clickable?: boolean; selected?: boolean } = {}): string {
  const base = 'w-16 h-20 rounded-lg border flex flex-col items-center justify-center text-center select-none';
  const ring = opts.selected ? 'ring-2 ring-amber-400' : opts.clickable ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400' : '';
  if (!card) return `<div class="${base} border-dashed border-slate-700 text-[10px] text-slate-600 ${ring}" ${attrs}>빈칸</div>`;
  if ((card.type as string) === 'hidden') {
    return `<div class="${base} border-slate-600 bg-gradient-to-br from-rose-900 to-slate-900 text-xl text-rose-200/60 ${ring}" ${attrs}>🂠</div>`;
  }
  const info = CARD_INFO[card.type];
  return `<div class="${base} ${card.type === 'mountain' ? 'border-slate-600 bg-slate-800' : 'border-amber-700/60 bg-amber-950/40'} ${ring}" title="${info?.hint ?? ''}" ${attrs}>
    <span class="text-2xl leading-none">${info?.emoji ?? '?'}</span>
    <span class="text-[10px] mt-1 text-slate-300">${info?.name ?? card.type}</span>
  </div>`;
}

function rowHtml(label: string, cards: (NaishiCard | null)[], zone: NaishiZone | 'river' | 'opp', clickable: boolean, picks: Pick[], extra?: (i: number) => string): string {
  return `
    <div class="flex items-center gap-2">
      <span class="w-10 text-[11px] text-slate-500 shrink-0">${label}</span>
      ${cards
        .map((c, i) => {
          const selected = picks.some((p) => p.zone === zone && p.index === i);
          const attrs = clickable ? `data-zone="${zone}" data-index="${i}"` : '';
          return `<div class="flex flex-col items-center gap-0.5">${cardHtml(c, attrs, { clickable, selected })}${extra ? extra(i) : ''}</div>`;
        })
        .join('')}
    </div>`;
}

function emissaryHtml(p: NaishiPlayerState): string {
  const locked = p.usedImperialDecree ? 1 : 0;
  const away = EMISSARIES_PER_PLAYER - p.emissaryTokens - locked;
  return `사절 ${'🟣'.repeat(p.emissaryTokens)}${'⚪'.repeat(Math.max(0, away))}${locked ? '📜' : ''} <span class="text-slate-500">(사용 가능 ${p.emissaryTokens}${away > 0 ? ` · 궁정 ${away}` : ''}${locked ? ' · 칙령 1' : ''})</span>`;
}

export function renderNaishi(container: HTMLElement, gs: NaishiGameState, ctx: Ctx): void {
  const ids = Object.keys(gs.players);
  const meId = ids.includes(ctx.myId) ? ctx.myId : ids[0];
  const oppId = ids.find((id) => id !== meId)!;
  const me = gs.players[meId];
  const opp = gs.players[oppId];
  const myTurn = !ctx.isSpectator && gs.phase === 'playing' && gs.currentPlayer === ctx.myId;
  const local = ctx.local;
  if (!myTurn) local.picks = [];
  // 주 행동을 이미 했으면 개발 모드는 의미가 없다
  if (myTurn && gs.mainDone && local.mode === 'develop') local.mode = 'swap';
  const canBonus = myTurn && !gs.bonusUsed && me.emissaryTokens > 0;
  const mode = local.mode;
  const myClickable = myTurn && ((mode === 'develop' && !gs.mainDone) || (canBonus && (mode === 'swap' || (mode === 'decree' && !gs.decreeUsedBy))));
  const riverClickable = myTurn && canBonus && (mode === 'swap' || mode === 'river');
  const gameOver = gs.phase === 'game_over';

  const modeBtn = (m: Mode, label: string, enabled: boolean) =>
    `<button data-mode="${m}" ${enabled ? '' : 'disabled'} class="px-3 py-1.5 rounded-lg text-xs ${mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'} disabled:opacity-40">${label}</button>`;
  const actBtn = (id: string, label: string, enabled: boolean, color: string) =>
    `<button id="${id}" ${enabled ? '' : 'disabled'} class="px-3 py-1.5 rounded-lg text-xs text-white ${color} disabled:opacity-40">${label}</button>`;
  const maxEmissaries = EMISSARIES_PER_PLAYER - (me.usedImperialDecree ? 1 : 0);

  container.innerHTML = `
    <div class="p-4 flex flex-col gap-4 max-w-3xl mx-auto">
      <div class="flex flex-wrap items-center gap-3 text-xs">
        <span class="px-2 py-0.5 rounded ${myTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}">
          ${gameOver ? '게임 종료' : myTurn ? '내 차례' : `${ctx.playerName(gs.currentPlayer)}의 차례`}
        </span>
        ${gs.finalTurnOf && !gameOver ? `<span class="text-amber-300">${ctx.playerName(gs.finalTurnOf)}의 마지막 턴</span>` : ''}
        ${gs.decreeUsedBy ? `<span class="text-slate-500">칙령: ${ctx.playerName(gs.decreeUsedBy)} 사용</span>` : ''}
        <span class="text-slate-500">버림 더미 ${gs.discardPile.length}장</span>
      </div>
      ${gs.lastAction ? `<p class="text-xs text-slate-400">${gs.lastAction}</p>` : ''}
      ${gameOver ? renderResult(gs, ctx) : ''}

      <div class="rounded-xl border border-slate-700 bg-slate-800/40 p-3 flex flex-col gap-2">
        <div class="text-xs font-bold text-slate-300">${ctx.playerName(oppId)} <span class="font-normal">${emissaryHtml(opp)}</span></div>
        ${rowHtml('손', opp.hand, 'opp', false, [])}
        ${rowHtml('줄', opp.line, 'opp', false, [])}
      </div>

      <div class="rounded-xl border border-sky-800/60 bg-sky-950/30 p-3">
        ${rowHtml('강', gs.river, 'river', riverClickable, local.picks, (i) => `<span class="text-[10px] ${gs.riverSizes[i] <= 1 ? 'text-rose-400' : 'text-slate-500'}">${i + 1}번 · ${gs.riverSizes[i]}장</span>`)}
      </div>

      <div class="rounded-xl border ${myTurn ? 'border-emerald-600/60' : 'border-slate-700'} bg-slate-800/40 p-3 flex flex-col gap-2">
        <div class="text-xs font-bold text-slate-300">${ctx.isSpectator ? ctx.playerName(meId) : '나'} <span class="font-normal">${emissaryHtml(me)}</span>
          ${ctx.isSpectator ? '' : `<span class="ml-2 text-amber-300 font-normal">현재 점수 ${calculateScore(gs, meId)}</span>`}</div>
        ${rowHtml('줄', me.line, 'line', myClickable, local.picks)}
        ${rowHtml('손', me.hand, 'hand', myClickable, local.picks)}
      </div>

      ${
        myTurn
          ? `
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-[11px] text-slate-500">주 행동${gs.mainDone ? ' (완료)' : ''}:</span>
            ${modeBtn('develop', '개발', !gs.mainDone)}
            ${actBtn('ns-recall', '사절 회수', !gs.mainDone && me.emissaryTokens < maxEmissaries, 'bg-violet-700 hover:bg-violet-600')}
            ${actBtn('ns-declare', '종료 선언', !gs.mainDone && !gs.bonusUsed && canDeclareEnd(gs), 'bg-amber-600 hover:bg-amber-500')}
          </div>
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-[11px] text-slate-500">사절 행동${gs.bonusUsed ? ' (완료)' : ''}:</span>
            ${modeBtn('swap', '교환', canBonus)}
            ${modeBtn('river', '강 정리', canBonus)}
            ${modeBtn('decree', '황제 칙령', canBonus && !gs.decreeUsedBy)}
          </div>
          <p class="text-[11px] text-slate-400">${MODE_HELP[mode]}</p>
          <div>${actBtn('ns-end-turn', '턴 종료', gs.mainDone, 'bg-indigo-600 hover:bg-indigo-500')}</div>
        </div>`
          : gameOver
            ? ''
            : `<p class="text-sm text-slate-400">${ctx.playerName(gs.currentPlayer)}의 차례를 기다리는 중...</p>`
      }
    </div>
  `;

  container.querySelectorAll<HTMLElement>('[data-mode]').forEach((btn) =>
    btn.addEventListener('click', () => {
      local.mode = btn.dataset.mode as Mode;
      local.picks = [];
      ctx.rerender();
    }),
  );
  container.querySelector('#ns-recall')?.addEventListener('click', () => ctx.dispatch({ type: 'recall_emissaries' }));
  container.querySelector('#ns-declare')?.addEventListener('click', () => ctx.dispatch({ type: 'declare_end' }));
  container.querySelector('#ns-end-turn')?.addEventListener('click', () => {
    local.mode = 'develop';
    local.picks = [];
    ctx.dispatch({ type: 'end_turn' });
  });

  container.querySelectorAll<HTMLElement>('[data-zone][data-index]').forEach((el) =>
    el.addEventListener('click', () => onPick({ zone: el.dataset.zone as Pick['zone'], index: Number(el.dataset.index) }, ctx)),
  );
}

function onPick(pick: Pick, ctx: Ctx) {
  const local = ctx.local;
  const send = (a: NaishiAction) => {
    local.picks = [];
    ctx.dispatch(a);
  };
  if (local.mode === 'develop' && pick.zone !== 'river') return send({ type: 'develop', targetZone: pick.zone, targetIndex: pick.index });
  if (local.mode === 'decree' && pick.zone !== 'river') return send({ type: 'imperial_decree', zone: pick.zone, targetIndex: pick.index });

  const [first] = local.picks;
  if (!first) {
    local.picks = [pick];
    return ctx.rerender();
  }
  if (first.zone === pick.zone && first.index === pick.index) {
    local.picks = [];
    return ctx.rerender();
  }
  if (local.mode === 'river') {
    return send({ type: 'remove_from_river', index1: first.index, index2: pick.index });
  }
  // 교환: 두 선택의 영역으로 종류를 정한다
  let kind: SwapKind | null = null;
  if (first.zone === pick.zone) kind = first.zone;
  else if (first.zone !== 'river' && pick.zone !== 'river') kind = 'column';
  if (!kind) {
    // 강과 내 카드는 바꿀 수 없다 → 새 선택으로 다시 시작
    local.picks = [pick];
    return ctx.rerender();
  }
  send({ type: 'swap_positions', zone: kind, index1: first.index, index2: pick.index });
}

function renderResult(gs: NaishiGameState, ctx: Ctx): string {
  const scores = Object.keys(gs.players).map((id) => `${ctx.playerName(id)} <b>${calculateScore(gs, id)}점</b>`);
  return `<div class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
    게임 종료${gs.winnerReason ? ` (${gs.winnerReason})` : ''} — ${scores.join(' · ')}
  </div>`;
}
