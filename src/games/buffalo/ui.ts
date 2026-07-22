import { store } from '../../state/store';
import { logSystem } from '../../ui/utils/log';
import type { BuffaloGameState, BuffaloPiece, BCAnyPayload } from '../../types';
import { createInitialGameState, getPieceAt, getValidMoves, movePiece } from './game';
import { sendBuffaloToHost, syncBuffaloStateToAll } from './networking';

const BOARD_ROWS = 11;
const BOARD_COLS = 7;
const RIVER_ROWS = [4, 5];

let selectedPiece: BuffaloPiece | null = null;

export function renderBuffaloScreen(gs: BuffaloGameState) {
  const container = document.getElementById('game-buffalo-content')!;
  const isMyTurn = (store.isHost && gs.currentTurn === 'buffalo') || (!store.isHost && gs.currentTurn === 'chief');
  const myRole = store.isHost ? 'buffalo' : 'chief';
  const roleLabel = myRole === 'buffalo' ? '버팔로' : '인디언 족장';

  container.innerHTML = `
    <header class="bg-slate-800/50 border-b border-slate-700 p-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold uppercase text-slate-400">버팔로 체스</span>
        <span class="text-xs px-2 py-0.5 rounded ${isMyTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}">
          ${isMyTurn ? '내 턴' : '상대 턴'}
        </span>
        <span class="text-xs text-slate-500">${roleLabel} 플레이어</span>
      </div>
      <button id="btn-bc-leave" class="text-xs px-3 py-1.5 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
        <i class="ph ph-sign-out"></i> 나가기
      </button>
    </header>

    <div class="flex-grow flex flex-col overflow-hidden p-4 gap-4">
      ${gs.phase === 'game_over' ? `
        <div class="text-center ${gs.winner === 'buffalo' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-blue-500/10 border border-blue-500/30'} rounded-xl p-6">
          <i class="ph ph-${gs.winner === 'buffalo' ? 'horse' : 'shield'} text-4xl ${gs.winner === 'buffalo' ? 'text-amber-400' : 'text-blue-400'} mb-2 block"></i>
          <p class="${gs.winner === 'buffalo' ? 'text-amber-200' : 'text-blue-200'} font-bold text-lg">
            ${gs.winner === 'buffalo' ? '버팔로 승리!' : '인디언 족장 승리!'}
          </p>
          <p class="text-sm text-slate-400 mt-1">${gs.winnerReason}</p>
          <button id="btn-bc-return" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors">
            대기실로 돌아가기
          </button>
        </div>
      ` : ''}

      <div class="flex justify-center">
        <div class="inline-flex flex-col gap-0">
          ${Array.from({ length: BOARD_ROWS }, (_, row) => `
            <div class="flex gap-0">
              ${Array.from({ length: BOARD_COLS }, (_, col) => {
                const piece = getPieceAt(gs, row, col);
                const isRiver = RIVER_ROWS.includes(row);
                const isValidMove = selectedPiece && getValidMoves(gs, selectedPiece).some(([r, c]) => r === row && c === col);
                const isSelected = selectedPiece?.row === row && selectedPiece?.col === col;
                const isClickable = isMyTurn && gs.phase === 'playing';

                let bgClass = 'bg-slate-800';
                if (isRiver) bgClass = 'bg-blue-900/50';
                else if (row % 2 === col % 2) bgClass = 'bg-slate-700/50';

                let borderClass = '';
                if (isSelected) borderClass = 'ring-2 ring-indigo-400';
                else if (isValidMove) borderClass = 'ring-2 ring-emerald-400/50';

                let cursorClass = '';
                if (isClickable && piece && ((store.isHost && piece.type === 'buffalo') || (!store.isHost && (piece.type === 'chief' || piece.type === 'dog')))) {
                  cursorClass = 'cursor-pointer';
                } else if (isClickable && isValidMove) {
                  cursorClass = 'cursor-pointer';
                }

                const pieceHtml = piece ? getPieceHtml(piece) : '';

                return `
                  <div class="w-10 h-10 sm:w-12 sm:h-12 ${bgClass} ${borderClass} ${cursorClass} flex items-center justify-center border border-slate-600/30 relative"
                       data-row="${row}" data-col="${col}">
                    ${pieceHtml}
                    ${isValidMove && !piece ? '<div class="absolute w-3 h-3 bg-emerald-400/40 rounded-full"></div>' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="flex justify-center gap-6 text-xs text-slate-400">
        <div class="flex items-center gap-1"><span class="text-lg">🦬</span> 버팔로 (전진만)</div>
        <div class="flex items-center gap-1"><span class="text-lg">🐕</span> 개 (체스 퀸)</div>
        <div class="flex items-center gap-1"><span class="text-lg">👤</span> 족장 (체스 킹)</div>
      </div>
    </div>
  `;

  attachBuffaloEvents(gs);
}

function getPieceHtml(piece: BuffaloPiece): string {
  switch (piece.type) {
    case 'buffalo':
      return '<span class="text-xl sm:text-2xl">🦬</span>';
    case 'dog':
      return '<span class="text-xl sm:text-2xl">🐕</span>';
    case 'chief':
      return '<span class="text-xl sm:text-2xl">👤</span>';
  }
}

function attachBuffaloEvents(gs: BuffaloGameState) {
  document.querySelectorAll('[data-row][data-col]').forEach((cell) => {
    cell.addEventListener('click', () => {
      if (gs.phase === 'game_over') return;
      const row = parseInt(cell.getAttribute('data-row')!);
      const col = parseInt(cell.getAttribute('data-col')!);
      handleCellClick(gs, row, col);
    });
  });

  const leaveBtn = document.getElementById('btn-bc-leave');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => returnToLobby());
  }

  const returnBtn = document.getElementById('btn-bc-return');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => returnToLobby());
  }
}

function handleCellClick(gs: BuffaloGameState, row: number, col: number) {
  const piece = getPieceAt(gs, row, col);
  const myRole = store.isHost ? 'buffalo' : 'chief';

  if (selectedPiece) {
    const validMoves = getValidMoves(gs, selectedPiece);
    const isValid = validMoves.some(([r, c]) => r === row && c === col);

    if (isValid) {
      sendBuffaloToHost({
        type: 'BC_MOVE',
        fromRow: selectedPiece.row,
        fromCol: selectedPiece.col,
        toRow: row,
        toCol: col,
      });
      selectedPiece = null;
      return;
    }
  }

  if (piece && ((myRole === 'buffalo' && piece.type === 'buffalo') || (myRole === 'chief' && (piece.type === 'chief' || piece.type === 'dog')))) {
    selectedPiece = piece;
    renderBuffaloScreen(gs);
  } else {
    selectedPiece = null;
    renderBuffaloScreen(gs);
  }
}

function returnToLobby() {
  store.currentScreen = 'room';
  store.buffalo = null;
  selectedPiece = null;
  logSystem('게임이 종료되었습니다. 대기실로 돌아갑니다.');
  if (store.isHost) {
    const payload: BCAnyPayload = { type: 'BC_RETURN_TO_LOBBY' };
    sendBuffaloToHost(payload);
    store.updateGameState({ status: 'LOBBY' });
    syncBuffaloStateToAll();
  }
}

export function handleBuffaloMessage(_senderId: string, payload: BCAnyPayload) {
  const gs = store.buffalo;
  if (!gs) return;

  switch (payload.type) {
    case 'BC_MOVE': {
      if (!store.isHost) return;
      const newGs = movePiece(gs, payload.fromRow, payload.fromCol, payload.toRow, payload.toCol);
      store.buffalo = newGs;
      syncBuffaloStateToAll();
      break;
    }

    case 'BC_STATE_SYNC':
      store.buffalo = payload.gs;
      renderBuffaloScreen(payload.gs);
      break;

    case 'BC_RETURN_TO_LOBBY':
      store.currentScreen = 'room';
      store.buffalo = null;
      selectedPiece = null;
      logSystem('방장이 게임을 종료했습니다. 대기실로 돌아갑니다.');
      break;
  }
}

export function startBuffaloGame() {
  store.buffalo = createInitialGameState();
  store.currentScreen = 'game-buffalo';

  if (store.isHost) {
    syncBuffaloStateToAll();
  }
  logSystem('버팔로 체스 게임을 시작합니다!');
}

export function initBuffaloScreen() {
  if (store.buffalo) {
    renderBuffaloScreen(store.buffalo);
  }
}
