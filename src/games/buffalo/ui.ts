import type { RenderContext } from '../../framework/types';
import type { BuffaloGameState, BuffaloPiece, BuffaloTurn } from './types';
import { getPieceAt, getValidMoves } from './game';

export type BuffaloAction = { type: 'move'; fromRow: number; fromCol: number; toRow: number; toCol: number };
export interface BuffaloLocal {
  selectedPiece: BuffaloPiece | null;
}
type Ctx = RenderContext<BuffaloAction, BuffaloLocal>;

export function roleOf(gs: BuffaloGameState, playerId: string): BuffaloTurn | null {
  if (gs.roles.buffalo === playerId) return 'buffalo';
  if (gs.roles.chief === playerId) return 'chief';
  return null;
}

export function ownsPiece(role: BuffaloTurn | null, piece: BuffaloPiece | undefined): boolean {
  if (!piece || !role) return false;
  return role === 'buffalo' ? piece.type === 'buffalo' : piece.type === 'chief' || piece.type === 'dog';
}

const BOARD_ROWS = 11;
const BOARD_COLS = 7;
const RIVER_ROWS = [4, 5];

export function renderBuffalo(container: HTMLElement, gs: BuffaloGameState, ctx: Ctx) {
  const myRole = roleOf(gs, ctx.myId);
  const isMyTurn = myRole !== null && gs.currentTurn === myRole;
  const roleLabel = myRole === 'buffalo' ? '버팔로' : myRole === 'chief' ? '인디언 족장' : '관전자';
  const selectedPiece = ctx.local.selectedPiece;

  container.innerHTML = `
    <div class="px-4 pt-3 flex items-center gap-3 text-xs">
      <span class="px-2 py-0.5 rounded ${isMyTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}">
        ${isMyTurn ? '내 턴' : `${ctx.playerName(gs.roles[gs.currentTurn])}의 턴`}
      </span>
      <span class="text-slate-500">나: ${roleLabel}</span>
    </div>

    <div class="flex flex-col p-4 gap-4">
      ${gs.phase === 'game_over' ? `
        <div class="text-center ${gs.winner === 'buffalo' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-blue-500/10 border border-blue-500/30'} rounded-xl p-6">
          <i class="ph ph-${gs.winner === 'buffalo' ? 'horse' : 'shield'} text-4xl ${gs.winner === 'buffalo' ? 'text-amber-400' : 'text-blue-400'} mb-2 block"></i>
          <p class="${gs.winner === 'buffalo' ? 'text-amber-200' : 'text-blue-200'} font-bold text-lg">
            ${gs.winner === 'buffalo' ? '버팔로 승리!' : '인디언 족장 승리!'}
          </p>
          <p class="text-sm text-slate-400 mt-1">${gs.winnerReason}</p>
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
                if (isClickable && ownsPiece(myRole, piece)) {
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

  attachBuffaloEvents(container, gs, ctx);
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

function attachBuffaloEvents(container: HTMLElement, gs: BuffaloGameState, ctx: Ctx) {
  container.querySelectorAll('[data-row][data-col]').forEach((cell) => {
    cell.addEventListener('click', () => {
      if (gs.phase === 'game_over') return;
      const row = parseInt(cell.getAttribute('data-row')!);
      const col = parseInt(cell.getAttribute('data-col')!);
      handleCellClick(gs, ctx, row, col);
    });
  });
}

function handleCellClick(gs: BuffaloGameState, ctx: Ctx, row: number, col: number) {
  const piece = getPieceAt(gs, row, col);
  const myRole = roleOf(gs, ctx.myId);
  const selected = ctx.local.selectedPiece;

  if (selected && getValidMoves(gs, selected).some(([r, c]) => r === row && c === col)) {
    ctx.local.selectedPiece = null;
    ctx.dispatch({ type: 'move', fromRow: selected.row, fromCol: selected.col, toRow: row, toCol: col });
    return;
  }

  ctx.local.selectedPiece = gs.currentTurn === myRole && ownsPiece(myRole, piece) ? piece! : null;
  ctx.rerender();
}
