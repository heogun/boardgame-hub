import type { BuffaloGameState, BuffaloPiece } from './types';

const BOARD_ROWS = 11;
const BOARD_COLS = 7;
const RIVER_ROWS = [4, 5];

export function createInitialGameState(buffaloId: string, chiefId: string): BuffaloGameState {
  const pieces: BuffaloPiece[] = [];

  for (let col = 0; col < BOARD_COLS; col++) {
    pieces.push({ type: 'buffalo', row: 0, col });
  }
  for (const col of [1, 2, 4, 5]) {
    pieces.push({ type: 'buffalo', row: 1, col });
  }

  pieces.push({ type: 'chief', row: 10, col: 3 });
  for (const col of [1, 2, 4, 5]) {
    pieces.push({ type: 'dog', row: 9, col });
  }

  return {
    roles: { buffalo: buffaloId, chief: chiefId },
    pieces,
    currentTurn: 'buffalo',
    phase: 'playing',
    winner: null,
    winnerReason: '',
  };
}

export function getPieceAt(gs: BuffaloGameState, row: number, col: number): BuffaloPiece | undefined {
  return gs.pieces.find((p) => p.row === row && p.col === col);
}

function isRiver(row: number): boolean {
  return RIVER_ROWS.includes(row);
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
}

export function getValidMoves(gs: BuffaloGameState, piece: BuffaloPiece): [number, number][] {
  const moves: [number, number][] = [];

  if (piece.type === 'buffalo') {
    const newRow = piece.row + 1;
    if (inBounds(newRow, piece.col) && !getPieceAt(gs, newRow, piece.col)) {
      moves.push([newRow, piece.col]);
    }
  } else if (piece.type === 'dog') {
    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1],
    ];
    for (const [dr, dc] of dirs) {
      let r = piece.row + dr;
      let c = piece.col + dc;
      while (inBounds(r, c)) {
        if (isRiver(r)) break;
        if (getPieceAt(gs, r, c)) break;
        moves.push([r, c]);
        r += dr;
        c += dc;
      }
    }
  } else if (piece.type === 'chief') {
    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1],
    ];
    for (const [dr, dc] of dirs) {
      const r = piece.row + dr;
      const c = piece.col + dc;
      if (!inBounds(r, c)) continue;
      if (isRiver(r)) continue;
      const target = getPieceAt(gs, r, c);
      if (!target || target.type === 'buffalo') {
        moves.push([r, c]);
      }
    }
  }

  return moves;
}

export function canAnyBuffaloMove(gs: BuffaloGameState): boolean {
  return gs.pieces
    .filter((p) => p.type === 'buffalo')
    .some((p) => getValidMoves(gs, p).length > 0);
}

export function hasBuffaloReachedEnd(gs: BuffaloGameState): boolean {
  return gs.pieces.some((p) => p.type === 'buffalo' && p.row === BOARD_ROWS - 1);
}

export function movePiece(gs: BuffaloGameState, fromRow: number, fromCol: number, toRow: number, toCol: number): BuffaloGameState {
  const piece = gs.pieces.find((p) => p.row === fromRow && p.col === fromCol);
  if (!piece) return gs;

  const validMoves = getValidMoves(gs, piece);
  const isValid = validMoves.some(([r, c]) => r === toRow && c === toCol);
  if (!isValid) return gs;

  let newPieces = gs.pieces.map((p) =>
    p.row === fromRow && p.col === fromCol ? { ...p, row: toRow, col: toCol } : p,
  );

  if (piece.type === 'chief') {
    const target = newPieces.find((p) => p.row === toRow && p.col === toCol && p !== piece);
    if (target && target.type === 'buffalo') {
      newPieces = newPieces.filter((p) => !(p.row === toRow && p.col === toCol && p.type === 'buffalo'));
    }
  }

  const newGs: BuffaloGameState = {
    ...gs,
    pieces: newPieces,
    currentTurn: gs.currentTurn === 'buffalo' ? 'chief' : 'buffalo',
  };

  if (hasBuffaloReachedEnd(newGs)) {
    return { ...newGs, phase: 'game_over', winner: 'buffalo', winnerReason: '버팔로가 도달!' };
  }

  if (!canAnyBuffaloMove(newGs)) {
    return { ...newGs, phase: 'game_over', winner: 'chief', winnerReason: '버팔로 이동 불가!' };
  }

  return newGs;
}
