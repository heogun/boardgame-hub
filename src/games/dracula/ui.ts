import type { RenderContext } from '../../framework/types';
import type { DraculaGameState, DraculaCard, CardSuit } from './types';
import { getTrumpSuit, canEndRound } from './game';

export type DraculaAction =
  | { type: 'draw' }
  | { type: 'discard'; card: DraculaCard; swapIndex?: number }
  | { type: 'swap'; index1: number; index2: number }
  | { type: 'swap_with_opponent'; myIndex: number }
  | { type: 'swap_trump'; newTrump: CardSuit }
  | { type: 'reveal'; target: 'self' | 'opponent' | 'deck'; index?: number }
  | { type: 'end_round' }
  | { type: 'next_round' };

export interface DraculaLocal {
  selectedCardIndex: number | null;
}
type Ctx = RenderContext<DraculaAction, DraculaLocal>;

const SUIT_COLORS: Record<CardSuit, string> = {
  red: 'text-red-400',
  blue: 'text-blue-400',
  green: 'text-emerald-400',
  yellow: 'text-yellow-400',
};

const SUIT_ICONS: Record<CardSuit, string> = {
  red: '🟥',
  blue: '🟦',
  green: '🟩',
  yellow: '🟨',
};

export function renderDracula(container: HTMLElement, gs: DraculaGameState, ctx: Ctx) {
  const myId = ctx.myId;
  const myPlayer = gs.players[myId];
  const myRole = myPlayer?.role ?? null;
  // 관전자는 첫 번째 플레이어 시점으로 본다
  const viewerId = myPlayer ? myId : Object.keys(gs.players)[0];
  const opponentId = Object.keys(gs.players).find((id) => id !== viewerId);
  const opponentPlayer = opponentId ? gs.players[opponentId] : null;
  const trumpSuit = getTrumpSuit(gs);
  const isMyTurn = gs.currentPlayer === myRole;

  container.innerHTML = `
    <div class="px-4 pt-3 flex flex-wrap items-center gap-3 text-xs">
      <span class="px-2 py-0.5 rounded ${isMyTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}">
        ${isMyTurn ? '내 턴' : gs.currentPlayer === 'dracula' ? '드라큘라의 턴' : '반헬싱의 턴'}
      </span>
      <span class="text-slate-500">라운드 ${gs.round} / ${gs.maxRounds}</span>
      <span class="text-red-400">드라큘라 HP: <b class="text-red-300">${gs.draculaHP} / ${gs.maxDraculaHP}</b></span>
      <span class="text-slate-400">트럼프: <b class="${SUIT_COLORS[trumpSuit]}">${SUIT_ICONS[trumpSuit]} ${trumpSuit}</b></span>
    </div>

    <div class="flex flex-col p-4 gap-4">
      ${gs.phase === 'game_over' ? renderGameOver(gs) : ''}
      ${gs.phase === 'round_end' ? renderRoundEnd(gs) : ''}

      ${renderDistricts(gs)}

      <div class="flex justify-between items-start gap-4">
        <div class="flex-1">
          <h3 class="text-xs font-bold text-slate-400 mb-2">${myPlayer ? '내 카드' : `${ctx.playerName(viewerId)}의 카드`} (${gs.players[viewerId]?.role === 'dracula' ? '드라큘라' : '반헬싱'})</h3>
          <div class="flex gap-2">
            ${gs.players[viewerId]?.rack.map((card, i) => renderCard(card, i, !!myPlayer, false, gs, ctx.local.selectedCardIndex === i && !!myPlayer)).join('')}
          </div>
        </div>

        <div class="flex-1">
          <h3 class="text-xs font-bold text-slate-400 mb-2">상대 카드</h3>
          <div class="flex gap-2">
            ${opponentPlayer?.rack.map((card, i) => renderCard(card, i, false, opponentPlayer.revealedCards.includes(i) || gs.phase === 'game_over', gs, false)).join('')}
          </div>
        </div>
      </div>

      <div class="flex justify-center gap-2">
        <button id="btn-dvh-draw" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors text-sm" ${!isMyTurn || gs.phase !== 'playing' ? 'disabled' : ''}>
          <i class="ph ph-cards"></i> 카드 뽑기
        </button>
        ${canEndRound(gs) ? `
          <button id="btn-dvh-end-round" class="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors text-sm" ${!isMyTurn || gs.phase !== 'playing' ? 'disabled' : ''}>
            <i class="ph ph-flag"></i> 라운드 종료
          </button>
        ` : ''}
      </div>
    </div>
  `;

  attachDraculaEvents(container, gs, ctx);
}

function renderCard(card: DraculaCard | null, index: number, isMine: boolean, isRevealed: boolean, gs: DraculaGameState, isSelected: boolean): string {
  if (!card) return '<div class="w-12 h-16 bg-slate-800 rounded-lg border border-slate-700"></div>';

  const trumpSuit = getTrumpSuit(gs);
  const isTrump = card.suit === trumpSuit;
  const showFace = isMine || isRevealed;

  if (!showFace) {
    return `
      <div class="w-12 h-16 bg-slate-700 rounded-lg border border-slate-600 flex items-center justify-center cursor-pointer card-back" data-index="${index}">
        <span class="text-xl">🂠</span>
      </div>
    `;
  }

  return `
    <div class="w-12 h-16 ${isTrump ? 'bg-amber-900/50 border-amber-500' : 'bg-slate-800 border-slate-600'} rounded-lg border flex flex-col items-center justify-center card-face ${isMine ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400' : ''} ${isSelected ? 'ring-2 ring-indigo-400' : ''}" data-mine="${isMine}"
         data-index="${index}" data-suit="${card.suit}" data-value="${card.value}">
      <span class="${SUIT_COLORS[card.suit]} text-lg font-bold">${card.value}</span>
      <span class="text-xs">${SUIT_ICONS[card.suit]}</span>
    </div>
  `;
}

function renderDistricts(gs: DraculaGameState): string {
  return `
    <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <h3 class="text-xs font-bold text-slate-400 mb-3">위트비 구역</h3>
      <div class="flex justify-between gap-2">
        ${gs.districts.map((d, i) => `
          <div class="flex-1 text-center">
            <div class="text-xs text-slate-500 mb-2">구역 ${i + 1}</div>
            <div class="flex justify-center gap-1">
              ${Array.from({ length: d.humans }, () => '<span class="text-lg">👤</span>').join('')}
              ${Array.from({ length: d.vampires }, () => '<span class="text-lg">🧛</span>').join('')}
            </div>
            <div class="text-xs text-slate-600 mt-1">${d.humans} 인간 / ${d.vampires} 흡혈鬼</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderGameOver(gs: DraculaGameState): string {
  const isDraculaWin = gs.winner === 'dracula';
  return `
    <div class="text-center ${isDraculaWin ? 'bg-red-500/10 border border-red-500/30' : 'bg-blue-500/10 border border-blue-500/30'} rounded-xl p-6">
      <i class="ph ph-${isDraculaWin ? 'skull' : 'crosshair'} text-4xl ${isDraculaWin ? 'text-red-400' : 'text-blue-400'} mb-2 block"></i>
      <p class="${isDraculaWin ? 'text-red-200' : 'text-blue-200'} font-bold text-lg">
        ${isDraculaWin ? '드라큘라 승리!' : '반헬싱 승리!'}
      </p>
      <p class="text-sm text-slate-400 mt-1">${gs.winnerReason}</p>
    </div>
  `;
}

function renderRoundEnd(gs: DraculaGameState): string {
  return `
    <div class="text-center bg-slate-700/50 border border-slate-600 rounded-xl p-4">
      <p class="text-slate-300 font-bold">라운드 ${gs.round} 종료</p>
      <button id="btn-dvh-next-round" class="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors text-sm">
        다음 라운드 시작
      </button>
    </div>
  `;
}

function attachDraculaEvents(container: HTMLElement, gs: DraculaGameState, ctx: Ctx) {
  // 내 카드 두 장을 차례로 누르면 자리를 바꾼다
  container.querySelectorAll<HTMLElement>('.card-face[data-mine="true"]').forEach((card) => {
    card.addEventListener('click', () => {
      if (gs.phase !== 'playing') return;
      const index = Number(card.dataset.index);
      const selected = ctx.local.selectedCardIndex;
      if (selected !== null && selected !== index) {
        ctx.local.selectedCardIndex = null;
        ctx.dispatch({ type: 'swap', index1: selected, index2: index });
        return;
      }
      ctx.local.selectedCardIndex = selected === index ? null : index;
      ctx.rerender();
    });
  });

  const on = (id: string, action: DraculaAction) => container.querySelector(`#${id}`)?.addEventListener('click', () => ctx.dispatch(action));
  on('btn-dvh-draw', { type: 'draw' });
  on('btn-dvh-end-round', { type: 'end_round' });
  on('btn-dvh-next-round', { type: 'next_round' });
}
