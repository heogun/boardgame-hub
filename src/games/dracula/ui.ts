import { store } from '../../state/store';
import { logSystem } from '../../ui/utils/log';
import type { DraculaGameState, DraculaCard, CardSuit, DVHAnyPayload } from '../../types';
import {
  createInitialGameState,
  getTrumpSuit,
  drawCard,
  discardCard,
  swapTwoCards,
  swapWithOpponent,
  swapTrump,
  revealCard,
  resolveRound,
  canEndRound,
  startNewRound,
} from './game';
import { sendDraculaToHost, syncDraculaStateToAll } from './networking';

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

export function renderDraculaScreen(gs: DraculaGameState) {
  const container = document.getElementById('game-dracula-content')!;
  const myId = store.myId!;
  const myPlayer = gs.players[myId];
  const myRole = myPlayer?.role || 'dracula';
  const opponentId = Object.keys(gs.players).find((id) => id !== myId);
  const opponentPlayer = opponentId ? gs.players[opponentId] : null;
  const trumpSuit = getTrumpSuit(gs);
  const isMyTurn = gs.currentPlayer === myRole;

  container.innerHTML = `
    <header class="bg-slate-800/50 border-b border-slate-700 p-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold uppercase text-slate-400">드라큘라 vs 반헬싱</span>
        <span class="text-xs px-2 py-0.5 rounded ${isMyTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}">
          ${isMyTurn ? '내 턴' : '상대 턴'}
        </span>
        <span class="text-xs text-slate-500">라운드 ${gs.round} / ${gs.maxRounds}</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1 text-xs">
          <span class="text-red-400">드라큘라 HP:</span>
          <span class="font-bold text-red-300">${gs.draculaHP} / ${gs.maxDraculaHP}</span>
        </div>
        <div class="flex items-center gap-1 text-xs">
          <span class="text-slate-400">트럼프:</span>
          <span class="${SUIT_COLORS[trumpSuit]} font-bold">${SUIT_ICONS[trumpSuit]} ${trumpSuit}</span>
        </div>
        <button id="btn-dvh-leave" class="text-xs px-3 py-1.5 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
          <i class="ph ph-sign-out"></i> 나가기
        </button>
      </div>
    </header>

    <div class="flex-grow flex flex-col overflow-hidden p-4 gap-4">
      ${gs.phase === 'game_over' ? renderGameOver(gs) : ''}
      ${gs.phase === 'round_end' ? renderRoundEnd(gs) : ''}

      ${renderDistricts(gs)}

      <div class="flex justify-between items-start gap-4">
        <div class="flex-1">
          <h3 class="text-xs font-bold text-slate-400 mb-2">내 카드 (${myRole === 'dracula' ? '드라큘라' : '반헬싱'})</h3>
          <div class="flex gap-2">
            ${myPlayer?.rack.map((card, i) => renderCard(card, i, true, false, gs)).join('')}
          </div>
        </div>

        <div class="flex-1">
          <h3 class="text-xs font-bold text-slate-400 mb-2">상대 카드</h3>
          <div class="flex gap-2">
            ${opponentPlayer?.rack.map((card, i) => renderCard(card, i, false, opponentPlayer.revealedCards.includes(i), gs)).join('')}
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

  attachDraculaEvents(gs);
}

function renderCard(card: DraculaCard | null, index: number, isMine: boolean, isRevealed: boolean, gs: DraculaGameState): string {
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
    <div class="w-12 h-16 ${isTrump ? 'bg-amber-900/50 border-amber-500' : 'bg-slate-800 border-slate-600'} rounded-lg border flex flex-col items-center justify-center cursor-pointer card-face ${isMine ? 'hover:ring-2 hover:ring-indigo-400' : ''}"
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
      <button id="btn-dvh-return" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors">
        대기실로 돌아가기
      </button>
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

function attachDraculaEvents(gs: DraculaGameState) {
  document.querySelectorAll('.card-face').forEach((card) => {
    card.addEventListener('click', () => {
      const index = parseInt(card.getAttribute('data-index')!);
      const suit = card.getAttribute('data-suit') as CardSuit;
      const value = parseInt(card.getAttribute('data-value')!);
      handleCardClick(gs, index, { suit, value });
    });
  });

  document.querySelectorAll('.card-back').forEach((card) => {
    card.addEventListener('click', () => {
      const index = parseInt(card.getAttribute('data-index')!);
      handleCardClick(gs, index, null);
    });
  });

  const drawBtn = document.getElementById('btn-dvh-draw');
  if (drawBtn) {
    drawBtn.addEventListener('click', () => {
      sendDraculaToHost({ type: 'DVH_DRAW_CARD' });
    });
  }

  const endRoundBtn = document.getElementById('btn-dvh-end-round');
  if (endRoundBtn) {
    endRoundBtn.addEventListener('click', () => {
      sendDraculaToHost({ type: 'DVH_END_ROUND' });
    });
  }

  const nextRoundBtn = document.getElementById('btn-dvh-next-round');
  if (nextRoundBtn) {
    nextRoundBtn.addEventListener('click', () => {
      sendDraculaToHost({ type: 'DVH_EXTRA_TURN' });
    });
  }

  const leaveBtn = document.getElementById('btn-dvh-leave');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => returnToLobby());
  }

  const returnBtn = document.getElementById('btn-dvh-return');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => returnToLobby());
  }
}

let selectedCardIndex: number | null = null;

function handleCardClick(gs: DraculaGameState, index: number, _card: DraculaCard | null) {
  if (gs.phase !== 'playing') return;

  const myId = store.myId!;
  const myPlayer = gs.players[myId];
  if (!myPlayer) return;

  if (selectedCardIndex !== null && selectedCardIndex !== index) {
    sendDraculaToHost({ type: 'DVH_SWAP_CARDS', index1: selectedCardIndex, index2: index });
    selectedCardIndex = null;
    return;
  }

  selectedCardIndex = index;
  renderDraculaScreen(gs);
}

function returnToLobby() {
  store.currentScreen = 'room';
  store.dracula = null;
  selectedCardIndex = null;
  logSystem('게임이 종료되었습니다. 대기실로 돌아갑니다.');
  if (store.isHost) {
    const payload: DVHAnyPayload = { type: 'DVH_RETURN_TO_LOBBY' };
    sendDraculaToHost(payload);
    store.updateGameState({ status: 'LOBBY' });
    syncDraculaStateToAll();
  }
}

export function handleDraculaMessage(senderId: string, payload: DVHAnyPayload) {
  const gs = store.dracula;
  if (!gs) return;

  switch (payload.type) {
    case 'DVH_DRAW_CARD': {
      if (!store.isHost) return;
      const newGs = drawCard(gs, senderId);
      store.dracula = newGs;
      syncDraculaStateToAll();
      break;
    }

    case 'DVH_DISCARD_CARD': {
      if (!store.isHost) return;
      const newGs = discardCard(gs, senderId, payload.card, payload.swapIndex);
      store.dracula = newGs;
      syncDraculaStateToAll();
      break;
    }

    case 'DVH_SWAP_CARDS': {
      if (!store.isHost) return;
      const newGs = swapTwoCards(gs, senderId, payload.index1, payload.index2);
      store.dracula = newGs;
      syncDraculaStateToAll();
      break;
    }

    case 'DVH_SWAP_WITH_OPPONENT': {
      if (!store.isHost) return;
      const newGs = swapWithOpponent(gs, senderId, payload.myIndex);
      store.dracula = newGs;
      syncDraculaStateToAll();
      break;
    }

    case 'DVH_SWAP_TRUMP': {
      if (!store.isHost) return;
      const newGs = swapTrump(gs, payload.newTrump);
      store.dracula = newGs;
      syncDraculaStateToAll();
      break;
    }

    case 'DVH_END_ROUND': {
      if (!store.isHost) return;
      const resolvedGs = resolveRound(gs);
      if (resolvedGs.phase === 'game_over') {
        store.dracula = resolvedGs;
        syncDraculaStateToAll();
      } else {
        store.dracula = { ...resolvedGs, phase: 'round_end' };
        syncDraculaStateToAll();
      }
      break;
    }

    case 'DVH_REVEAL_CARD': {
      if (!store.isHost) return;
      const newGs = revealCard(gs, payload.target, senderId, payload.index);
      store.dracula = newGs;
      syncDraculaStateToAll();
      break;
    }

    case 'DVH_EXTRA_TURN': {
      if (!store.isHost) return;
      const newGs = startNewRound(gs);
      store.dracula = newGs;
      syncDraculaStateToAll();
      break;
    }

    case 'DVH_STATE_SYNC':
      store.dracula = payload.gs;
      renderDraculaScreen(payload.gs);
      break;

    case 'DVH_RETURN_TO_LOBBY':
      store.currentScreen = 'room';
      store.dracula = null;
      selectedCardIndex = null;
      logSystem('방장이 게임을 종료했습니다. 대기실로 돌아갑니다.');
      break;
  }
}

export function startDraculaGame() {
  const playerIds = store.gameState.players.map((p) => p.id);
  if (playerIds.length < 2) return;

  store.dracula = createInitialGameState(playerIds[0], playerIds[1]);
  store.currentScreen = 'game-dracula';

  if (store.isHost) {
    syncDraculaStateToAll();
  }
  logSystem('드라큘라 vs 반헬싱 게임을 시작합니다!');
}

export function initDraculaScreen() {
  if (store.dracula) {
    renderDraculaScreen(store.dracula);
  }
}
