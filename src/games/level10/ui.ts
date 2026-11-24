import type { RenderContext } from '../../framework/types';
import type { Level10GameState } from './types';
import { getMyHand } from './game';

export type Level10Action =
  | { type: 'play'; value: number }
  | { type: 'ready' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'next_level' }
  | { type: 'suggest_star' }
  | { type: 'vote_star'; agree: boolean };

type Ctx = RenderContext<Level10Action, Record<string, never>>;

export function renderLevel10(container: HTMLElement, gs: Level10GameState, ctx: Ctx) {
  const myHand = getMyHand(gs, ctx.myId);

  const totalCards = gs.players.reduce((s, h) => s + h.cards.length, 0);
  const playedCount = gs.centerPile.length;
  const centerLabel = totalCards > 0 ? `${playedCount} / ${totalCards}` : '';

  container.innerHTML = `
    <div class="px-4 pt-3 flex items-center gap-3 text-xs">
      <span class="font-bold uppercase text-slate-400">레벨 ${gs.currentLevel} / ${gs.maxLevel}</span>
      <span class="flex items-center gap-1"><i class="ph ph-heart-straight text-red-400"></i> ${gs.lives}</span>
      <span class="flex items-center gap-1"><i class="ph ph-star text-yellow-400"></i> ${gs.throwingStars}</span>
      ${gs.blindMode ? '<span class="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">BLIND</span>' : ''}
    </div>

    <div class="flex-grow flex flex-col p-4 gap-4">
      <div class="flex justify-center gap-2">
        ${gs.players.map((h) => {
          const name = ctx.playerName(h.playerId);
          const isMe = h.playerId === ctx.myId;
          return `<div class="text-xs px-3 py-1 rounded-full ${isMe ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
            ${name} (${h.cards.length})
          </div>`;
        }).join('')}
      </div>

      <div class="flex-1 flex flex-col items-center justify-center gap-3">
        ${gs.phase === 'concentration' ? `
          <div class="text-center">
            <i class="ph ph-hand-eye text-5xl text-indigo-400 mb-3 block animate-pulse"></i>
            <p class="text-slate-300 font-medium">레벨 ${gs.currentLevel} 준비</p>
            <p class="text-xs text-slate-500 mt-1">준비되면 아래 버튼을 눌러주세요</p>
            <button id="btn-l10-ready" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all text-lg">
              준비 완료!
            </button>
          </div>
        ` : gs.phase === 'error_pause' ? `
          <div class="text-center bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <i class="ph ph-warning-circle text-4xl text-red-400 mb-2 block"></i>
            <p class="text-red-200 font-bold text-lg">순서 오류!</p>
            <p class="text-red-300/80 text-sm mt-1">${gs.errorCard} 은(는) 지금 낼 수 없는 카드입니다</p>
            <p class="text-xs text-slate-400 mt-2">낮은 카드가 버려졌습니다. 계속 진행하려면 클릭</p>
            <button id="btn-l10-resume" class="mt-3 bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors">
              계속하기
            </button>
          </div>
        ` : gs.phase === 'level_complete' ? `
          <div class="text-center bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
            <i class="ph ph-check-circle text-4xl text-emerald-400 mb-2 block"></i>
            <p class="text-emerald-200 font-bold text-lg">레벨 ${gs.currentLevel} 클리어!</p>
            <button id="btn-l10-next" class="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-colors">${gs.currentLevel >= gs.maxLevel ? '최종 결과 보기' : '다음 레벨'}</button>
          </div>
        ` : gs.phase === 'game_over_victory' ? `
          <div class="text-center bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8">
            <i class="ph ph-trophy text-5xl text-yellow-400 mb-3 block"></i>
            <p class="text-yellow-200 font-bold text-2xl">승리!</p>
            <p class="text-slate-300 mt-2">모든 레벨을 클리어했습니다!</p>
          </div>
        ` : gs.phase === 'game_over_defeat' ? `
          <div class="text-center bg-red-500/10 border border-red-500/30 rounded-xl p-8">
            <i class="ph ph-skull text-5xl text-red-400 mb-3 block"></i>
            <p class="text-red-200 font-bold text-2xl">패배...</p>
            <p class="text-slate-300 mt-2">모든 생명을 잃었습니다</p>
          </div>
        ` : `
          <div class="flex flex-wrap justify-center gap-2 mb-2">
            ${gs.centerPile.map((v) => `<span class="w-10 h-14 bg-indigo-500/20 border border-indigo-500/40 rounded-lg flex items-center justify-center text-sm font-bold text-indigo-300">${v}</span>`).join('')}
          </div>
          ${centerLabel ? `<p class="text-xs text-slate-500">${centerLabel}</p>` : ''}
        `}
      </div>

      ${
        gs.phase === 'playing' || gs.phase === 'concentration' || gs.phase === 'error_pause'
          ? `
        <div class="flex justify-center gap-2 flex-wrap">
          ${gs.phase === 'playing'
            ? [...(gs.throwingStars > 0 && !gs.starVote ? ['<button id="btn-l10-suggest-star" class="text-xs px-3 py-1.5 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded-lg border border-yellow-600/30 transition-colors"><i class="ph ph-star"></i> 별 제안</button>'] : []),
              '<button id="btn-l10-pause" class="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"><i class="ph ph-pause"></i> 일시정지</button>',
            ].join('') : ''}
        </div>
        ` : ''
      }

      ${gs.starVote ? renderStarVote(gs, ctx) : ''}

      ${
        gs.phase === 'playing' && myHand.length > 0
          ? `
        <div class="shrink-0">
          <p class="text-xs text-slate-500 mb-2 text-center">내 카드 (가장 작은 카드부터 내세요)</p>
          <div class="flex justify-center gap-2 flex-wrap">
            ${myHand.map((c, i) => `
              <button class="l10-card-btn w-14 h-20 rounded-xl text-lg font-bold transition-all duration-150
                ${i === 0
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }"
                data-value="${c}"
                ${i === 0 ? '' : 'disabled'}
              >${c}</button>
            `).join('')}
          </div>
        </div>
        ` : ''
      }
    </div>
  `;

  attachLevel10Events(container, ctx);
}

function renderStarVote(gs: Level10GameState, ctx: Ctx): string {
  const vote = gs.starVote!;
  const iAgreed = vote.agreed.includes(ctx.myId);
  const waiting = gs.players.filter((h) => !vote.agreed.includes(h.playerId)).map((h) => ctx.playerName(h.playerId));
  return `
    <div class="mx-auto max-w-md w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
      <p class="text-yellow-200 font-bold"><i class="ph ph-star"></i> ${ctx.playerName(vote.suggesterId)} 님이 별 사용을 제안했습니다</p>
      <p class="text-xs text-slate-400 mt-1">모두 동의하면 각자 가장 낮은 카드 1장을 버립니다 · 대기: ${waiting.join(', ') || '없음'}</p>
      ${ctx.isSpectator || iAgreed ? '' : `
        <div class="flex gap-2 justify-center mt-3">
          <button id="btn-star-yes" class="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-5 py-1.5 rounded-lg">동의</button>
          <button id="btn-star-no" class="bg-slate-700 hover:bg-slate-600 text-white px-5 py-1.5 rounded-lg">반대</button>
        </div>`}
    </div>
  `;
}

function attachLevel10Events(container: HTMLElement, ctx: Ctx) {
  const on = (id: string, action: Level10Action) => container.querySelector(`#${id}`)?.addEventListener('click', () => ctx.dispatch(action));

  container.querySelectorAll<HTMLButtonElement>('.l10-card-btn').forEach((btn) => {
    btn.addEventListener('click', () => ctx.dispatch({ type: 'play', value: Number(btn.dataset.value) }));
  });
  on('btn-l10-ready', { type: 'ready' });
  on('btn-l10-resume', { type: 'resume' });
  on('btn-l10-pause', { type: 'pause' });
  on('btn-l10-next', { type: 'next_level' });
  on('btn-l10-suggest-star', { type: 'suggest_star' });
  on('btn-star-yes', { type: 'vote_star', agree: true });
  on('btn-star-no', { type: 'vote_star', agree: false });
}
