import type { RenderContext } from '../../framework/types';
import type { DraculaGameState, DraculaCard, DraculaPlayerState, CardSuit } from './types';
import { getTrumpSuit, canEndRound } from './game';

export type DraculaAction =
  | { type: 'draw' }
  /** swapIndex 가 없으면 뽑은 카드를 버리고, 있으면 그 자리 카드와 바꾼 뒤 원래 카드를 버린다 */
  | { type: 'discard'; swapIndex?: number }
  | { type: 'swap'; index1: number; index2: number }
  | { type: 'swap_with_opponent'; myIndex: number }
  | { type: 'swap_trump'; newTrump: CardSuit }
  | { type: 'reveal'; target: 'self' | 'opponent' | 'deck'; index?: number }
  | { type: 'skip_ability' }
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

export const SUIT_NAME: Record<CardSuit, string> = {
  red: '빨강',
  blue: '파랑',
  green: '초록',
  yellow: '노랑',
};

const ABILITY_TEXT: Record<CardSuit, string> = {
  red: '상대 카드 한 장을 공개하거나(상대 카드 클릭) 덱 맨 위를 엿봅니다.',
  blue: '내 카드 두 장을 차례로 눌러 자리를 바꿉니다.',
  green: '내 카드 하나를 누르면 같은 구역의 상대 카드와 맞바꿉니다.',
  yellow: '트럼프로 만들 색을 고릅니다.',
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
  const isMyTurn = gs.phase === 'playing' && gs.currentPlayer === myRole;
  const ability = isMyTurn && gs.step === 'ability' ? gs.pendingAbility : null;
  const viewer = gs.players[viewerId];
  if (!isMyTurn || gs.step === 'draw') ctx.local.selectedCardIndex = null;

  // 내 카드를 누를 수 있는 경우: 교체(place), 파랑(두 장 교환), 초록(상대와 교환)
  const myCardsClickable = isMyTurn && (gs.step === 'place' || ability === 'blue' || ability === 'green');
  // 상대의 뒷면 카드를 누를 수 있는 경우: 빨강(공개)
  const oppCardsClickable = ability === 'red';

  container.innerHTML = `
    <div class="px-4 pt-3 flex flex-wrap items-center gap-3 text-xs">
      <span class="px-2 py-0.5 rounded ${isMyTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}">
        ${isMyTurn ? '내 턴' : gs.currentPlayer === 'dracula' ? '드라큘라의 턴' : '반헬싱의 턴'}
      </span>
      <span class="text-slate-500">라운드 ${gs.round} / ${gs.maxRounds}</span>
      <span class="text-red-400">드라큘라 HP: <b class="text-red-300">${gs.draculaHP} / ${gs.maxDraculaHP}</b></span>
      <span class="text-slate-400">색 순위: ${gs.colorRanking.map((c) => `<span title="${SUIT_NAME[c]}">${SUIT_ICONS[c]}</span>`).join(' &lt; ')} (트럼프 <b class="${SUIT_COLORS[trumpSuit]}">${SUIT_NAME[trumpSuit]}</b>)</span>
      <span class="text-slate-500">덱 ${gs.deck.length} · 버림 ${gs.discardPile.length}${gs.discardPile.length ? ` (맨 위 ${gs.discardPile[gs.discardPile.length - 1].value}${SUIT_ICONS[gs.discardPile[gs.discardPile.length - 1].suit]})` : ''}</span>
    </div>
    ${gs.lastAction ? `<p class="px-4 pt-1 text-xs text-slate-400">${gs.lastAction}</p>` : ''}

    <div class="flex flex-col p-4 gap-4">
      ${gs.phase === 'game_over' ? renderGameOver(gs) : ''}
      ${gs.phase === 'round_end' ? renderRoundEnd(gs) : ''}

      ${renderDistricts(gs)}

      <div class="flex flex-wrap justify-between items-start gap-4">
        <div class="flex-1">
          <h3 class="text-xs font-bold text-slate-400 mb-2">${myPlayer ? '내 카드' : `${ctx.playerName(viewerId)}의 카드`} (${viewer?.role === 'dracula' ? '드라큘라' : '반헬싱'})</h3>
          <div class="flex gap-2">
            ${viewer?.rack.map((card, i) => renderCard(card, i, !!myPlayer, viewer.revealedCards.includes(i), gs, ctx.local.selectedCardIndex === i && !!myPlayer, myCardsClickable)).join('')}
          </div>
        </div>

        <div class="flex-1">
          <h3 class="text-xs font-bold text-slate-400 mb-2">상대 카드${opponentPlayer?.drawnCard ? ' · 카드를 뽑아 들고 있음' : ''}</h3>
          <div class="flex gap-2">
            ${opponentPlayer?.rack.map((card, i) => renderCard(card, i, false, opponentPlayer.revealedCards.includes(i) || gs.phase === 'game_over', gs, false, oppCardsClickable && !opponentPlayer.revealedCards.includes(i))).join('')}
          </div>
        </div>
      </div>

      ${myPlayer?.revealedDeckCard ? `<p class="text-xs text-slate-400 text-center">엿본 덱 맨 위 카드: <b class="${SUIT_COLORS[myPlayer.revealedDeckCard.suit]}">${myPlayer.revealedDeckCard.value} ${SUIT_ICONS[myPlayer.revealedDeckCard.suit]}</b></p>` : ''}

      ${isMyTurn ? renderControls(gs, myPlayer!) : ''}
    </div>
  `;

  attachDraculaEvents(container, gs, ctx);
}

function renderControls(gs: DraculaGameState, me: DraculaPlayerState): string {
  const btn = 'text-white px-4 py-2 rounded-lg transition-colors text-sm';
  if (gs.step === 'draw') {
    const canEnd = canEndRound(gs) || gs.deck.length === 0;
    return `
      <div class="flex justify-center gap-2">
        <button id="btn-dvh-draw" class="bg-indigo-600 hover:bg-indigo-500 ${btn}" ${gs.deck.length === 0 ? 'disabled' : ''}>
          <i class="ph ph-cards"></i> 카드 뽑기
        </button>
        ${canEnd ? `<button id="btn-dvh-end-round" class="bg-amber-600 hover:bg-amber-500 ${btn}"><i class="ph ph-flag"></i> 라운드 종료 (판정)</button>` : ''}
      </div>
      ${canEnd ? '' : `<p class="text-[11px] text-slate-500 text-center">버림 더미가 6장 이상이면 뽑는 대신 라운드를 끝낼 수 있습니다.</p>`}
    `;
  }
  if (gs.step === 'place' && me.drawnCard) {
    const c = me.drawnCard;
    return `
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-400">뽑은 카드</span>
          ${renderCard(c, -1, true, false, gs, false, false)}
          <button id="btn-dvh-discard" class="bg-slate-600 hover:bg-slate-500 ${btn}"><i class="ph ph-trash"></i> 버리기</button>
        </div>
        <p class="text-[11px] text-slate-500">또는 내 카드 하나를 눌러 뽑은 카드와 바꾸세요 (원래 카드는 버려집니다).</p>
      </div>
    `;
  }
  if (gs.step === 'ability' && gs.pendingAbility) {
    const suit = gs.pendingAbility;
    const trump = getTrumpSuit(gs);
    return `
      <div class="flex flex-col items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
        <p class="text-sm"><b class="${SUIT_COLORS[suit]}">${SUIT_ICONS[suit]} ${SUIT_NAME[suit]} 능력</b> — ${ABILITY_TEXT[suit]}</p>
        <div class="flex flex-wrap justify-center gap-2">
          ${suit === 'red' && gs.deck.length > 0 ? `<button id="btn-dvh-peek" class="bg-red-700 hover:bg-red-600 ${btn}">덱 맨 위 엿보기</button>` : ''}
          ${suit === 'yellow' ? gs.colorRanking.filter((c) => c !== trump).map((c) => `<button data-trump="${c}" class="bg-slate-700 hover:bg-slate-600 ${btn}">${SUIT_ICONS[c]} ${SUIT_NAME[c]}</button>`).join('') : ''}
          <button id="btn-dvh-skip" class="bg-slate-600 hover:bg-slate-500 ${btn}">건너뛰고 턴 넘기기</button>
        </div>
      </div>
    `;
  }
  return '';
}

function renderCard(card: DraculaCard | null, index: number, isMine: boolean, isRevealed: boolean, gs: DraculaGameState, isSelected: boolean, clickable: boolean): string {
  if (!card) return '<div class="w-12 h-16 bg-slate-800 rounded-lg border border-slate-700"></div>';

  const trumpSuit = getTrumpSuit(gs);
  const isTrump = card.suit === trumpSuit;
  const showFace = isMine || isRevealed;

  if (!showFace) {
    return `
      <div class="w-12 h-16 bg-slate-700 rounded-lg border border-slate-600 flex items-center justify-center card-back ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-red-400' : ''}" data-index="${index}" data-clickable="${clickable}">
        <span class="text-xl">🂠</span>
      </div>
    `;
  }

  return `
    <div class="w-12 h-16 ${isTrump ? 'bg-amber-900/50 border-amber-500' : 'bg-slate-800 border-slate-600'} rounded-lg border flex flex-col items-center justify-center card-face ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400' : ''} ${isSelected ? 'ring-2 ring-indigo-400' : ''}" data-mine="${isMine}"
         data-clickable="${clickable}" data-revealed="${isRevealed}" data-index="${index}" data-suit="${card.suit}" data-value="${card.value}">
      <span class="${SUIT_COLORS[card.suit]} text-lg font-bold">${card.value}</span>
      <span class="text-xs">${SUIT_ICONS[card.suit]}${isMine && isRevealed ? '👁' : ''}</span>
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
            <div class="text-xs text-slate-600 mt-1">${d.humans} 인간 / ${d.vampires} 흡혈귀</div>
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
  const ability = gs.step === 'ability' ? gs.pendingAbility : null;

  container.querySelectorAll<HTMLElement>('.card-face[data-mine="true"][data-clickable="true"]').forEach((card) => {
    card.addEventListener('click', () => {
      const index = Number(card.dataset.index);
      if (gs.step === 'place') {
        ctx.dispatch({ type: 'discard', swapIndex: index });
      } else if (ability === 'green') {
        ctx.dispatch({ type: 'swap_with_opponent', myIndex: index });
      } else if (ability === 'blue') {
        // 두 장을 차례로 누르면 자리를 바꾼다
        const selected = ctx.local.selectedCardIndex;
        if (selected !== null && selected !== index) {
          ctx.local.selectedCardIndex = null;
          ctx.dispatch({ type: 'swap', index1: selected, index2: index });
          return;
        }
        ctx.local.selectedCardIndex = selected === index ? null : index;
        ctx.rerender();
      }
    });
  });

  container.querySelectorAll<HTMLElement>('.card-back[data-clickable="true"]').forEach((card) => {
    card.addEventListener('click', () => ctx.dispatch({ type: 'reveal', target: 'opponent', index: Number(card.dataset.index) }));
  });

  container.querySelectorAll<HTMLElement>('[data-trump]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.dispatch({ type: 'swap_trump', newTrump: btn.dataset.trump as CardSuit }));
  });

  const on = (id: string, action: DraculaAction) => container.querySelector(`#${id}`)?.addEventListener('click', () => ctx.dispatch(action));
  on('btn-dvh-draw', { type: 'draw' });
  on('btn-dvh-discard', { type: 'discard' });
  on('btn-dvh-peek', { type: 'reveal', target: 'deck' });
  on('btn-dvh-skip', { type: 'skip_ability' });
  on('btn-dvh-end-round', { type: 'end_round' });
  on('btn-dvh-next-round', { type: 'next_round' });
}
