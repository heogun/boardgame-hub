/**
 * 틱택토 — 새 게임을 만들 때 참고하는 최소 예제.
 *
 * 게임 하나 = 이 폴더 하나. `export default defineGame({...})` 만 하면 자동 등록된다.
 *   setup  : 초기 상태 (방장)
 *   reduce : 액션 검증·적용, 위반이면 IllegalAction (방장)
 *   result : 끝났으면 결과 요약
 *   render : 상태를 그리고, 입력은 ctx.dispatch 로 보낸다
 */
import { defineGame, IllegalAction } from '../../framework/types';

type Mark = 'X' | 'O';

interface State {
  board: (Mark | null)[];
  marks: Record<string, Mark>;
  turn: string;
  winner: string | null;
  draw: boolean;
}

type Action = { type: 'place'; cell: number };

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export default defineGame<State, Action>({
  id: 'tictactoe',
  name: '틱택토',
  description: '프레임워크 예제 게임',
  icon: 'ph-hash',
  minPlayers: 2,
  maxPlayers: 2,

  setup({ players }) {
    const [a, b] = players;
    return {
      board: Array(9).fill(null),
      marks: { [a.id]: 'X', [b.id]: 'O' },
      turn: a.id,
      winner: null,
      draw: false,
    };
  },

  reduce(state, action, { playerId, players }) {
    if (state.winner || state.draw) throw new IllegalAction('게임이 이미 끝났습니다.');
    if (state.turn !== playerId) throw new IllegalAction('당신의 차례가 아닙니다.');
    const cell = action.cell;
    if (!Number.isInteger(cell) || cell < 0 || cell > 8 || state.board[cell]) {
      throw new IllegalAction('둘 수 없는 칸입니다.');
    }

    state.board[cell] = state.marks[playerId];
    const mark = state.marks[playerId];
    if (LINES.some((line) => line.every((i) => state.board[i] === mark))) {
      state.winner = playerId;
    } else if (state.board.every(Boolean)) {
      state.draw = true;
    } else {
      state.turn = players.find((p) => p.id !== playerId)!.id;
    }
    return state;
  },

  result(state, players) {
    if (state.draw) return { summary: '무승부' };
    if (state.winner) return { summary: `${players.find((p) => p.id === state.winner)?.name ?? '?'} 승리` };
    return null;
  },

  render(container, state, ctx) {
    const myTurn = state.turn === ctx.myId && !state.winner && !state.draw;
    container.innerHTML = `
      <div class="flex flex-col items-center gap-4 p-6">
        <p class="text-sm text-slate-300">
          ${[
            state.winner || state.draw ? '' : myTurn ? '<span class="text-emerald-300 font-bold">내 차례</span>' : `${ctx.playerName(state.turn)}의 차례`,
            ctx.isSpectator ? '' : `나는 <b>${state.marks[ctx.myId]}</b>`,
          ].filter(Boolean).join(' · ')}
        </p>
        <div class="grid grid-cols-3 gap-2">
          ${state.board
            .map(
              (m, i) => `<button data-cell="${i}" class="w-20 h-20 rounded-xl text-3xl font-black border border-slate-600
                ${m === 'X' ? 'text-indigo-300' : 'text-amber-300'} ${!m && myTurn ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-800/50'}"
                ${!m && myTurn ? '' : 'disabled'}>${m ?? ''}</button>`,
            )
            .join('')}
        </div>
      </div>
    `;
    container.querySelectorAll<HTMLButtonElement>('[data-cell]').forEach((btn) => {
      btn.addEventListener('click', () => ctx.dispatch({ type: 'place', cell: Number(btn.dataset.cell) }));
    });
  },
});
