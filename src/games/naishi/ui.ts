import type { RenderContext } from '../../framework/types';
import type { NaishiGameState, NaishiPlayerState, NaishiCard } from './types';
import { calculateScore, canDeclareEnd } from './game';

export type NaishiAction = { type: 'end_turn' } | { type: 'declare_end' };
type Ctx = RenderContext<NaishiAction, Record<string, never>>;

let nameOf: (id: string) => string = (id) => id;

const CARD_EMOJI: Record<string, string> = {
  mountain: '⛰️',
  naishi: '👑',
  advisor: '📜',
  fort: '🏰',
  sentinel: '🛡️',
  torii: '⛩️',
  monk: '🧘',
  rice_field: '🌾',
  banner: '🚩',
  horseman: '🐎',
  ronin: '⚔️',
  ninja: '🥷',
};

function renderCard(card: NaishiCard | null, index: number, zone: 'line' | 'hand', interactive: boolean, selected: boolean): string {
  if (!card) {
    return `<div class="ns-slot" data-zone="${zone}" data-index="${index}">Empty</div>`;
  }
  if ((card.type as string) === 'hidden') {
    return `<div class="ns-card" data-zone="${zone}" data-index="${index}">🂠</div>`;
  }
  const emoji = CARD_EMOJI[card.type] || '?';
  const selectedClass = selected ? 'ns-selected' : '';
  const interactiveClass = interactive ? 'ns-interactive' : '';
  return `<div class="ns-card ${selectedClass} ${interactiveClass}" data-zone="${zone}" data-index="${index}" data-card-type="${card.type}">${emoji}<br><small>${card.type}</small></div>`;
}

function renderPlayerArea(playerId: string, player: NaishiPlayerState, isCurrentPlayer: boolean, currentUserId: string): string {
  const isActive = isCurrentPlayer && playerId === currentUserId;
  const zoneClass = isActive ? 'ns-zone-active' : '';
  const label = playerId === currentUserId ? '나' : nameOf(playerId);

  return `
    <div class="ns-player-area ${zoneClass}" data-player="${playerId}">
      <h3 class="font-bold text-sm mb-1">${label} ${isCurrentPlayer ? '<span class="text-emerald-300">(턴)</span>' : ''}</h3>
      <div class="ns-line">
        <strong>Line:</strong>
        ${player.line.map((card, i) => renderCard(card, i, 'line', isActive, false)).join('')}
      </div>
      <div class="ns-hand">
        <strong>Hand:</strong>
        ${player.hand.map((card, i) => renderCard(card, i, 'hand', isActive, false)).join('')}
      </div>
      <div class="ns-info">Emissaries: ${player.emissaryTokens} ${player.usedImperialDecree ? '(Decree used)' : ''}</div>
    </div>
  `;
}

function renderRiver(gs: NaishiGameState, isCurrentPlayer: boolean): string {
  if (!isCurrentPlayer) return '';
  return `
    <div class="ns-river">
      <strong>River:</strong>
      ${gs.river.map((card, i) => {
        if (!card) return `<div class="ns-slot ns-empty">Empty (${gs.riverSizes[i]} left)</div>`;
        return `<div class="ns-card ns-interactive" data-river-index="${i}">${CARD_EMOJI[card.type] || '?'}<br><small>${card.type}</small></div>`;
      }).join('')}
    </div>
  `;
}

function renderActions(gs: NaishiGameState, currentUserId: string): string {
  if (gs.phase === 'game_over') {
    const scores = Object.keys(gs.players).map((id) => `${nameOf(id)} ${calculateScore(gs, id)}점`);
    return `<div class="ns-result mt-2 text-sm"><b>게임 종료</b> — ${scores.join(' · ')}</div>`;
  }
  if (gs.currentPlayer !== currentUserId) return `<p class="text-sm text-slate-400">${nameOf(gs.currentPlayer)}의 차례를 기다리는 중...</p>`;

  return `
    <div class="ns-actions flex gap-2 mt-2">
      <button id="ns-end-turn" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm">턴 종료</button>
      ${canDeclareEnd(gs) ? '<button id="ns-declare-end" class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm">게임 종료 선언</button>' : ''}
    </div>
  `;
}

export function renderNaishi(container: HTMLElement, gs: NaishiGameState, ctx: Ctx): void {
  nameOf = ctx.playerName;
  const { currentPlayer } = gs;
  const playerIds = Object.keys(gs.players);
  const currentUserId = ctx.myId;

  container.innerHTML = `
    <div class="ns-game p-4 flex flex-col gap-3">
      ${playerIds.map((id) => renderPlayerArea(id, gs.players[id], id === currentPlayer, currentUserId)).join('')}
      ${renderRiver(gs, currentPlayer === currentUserId)}
      ${renderActions(gs, currentUserId)}
      <p class="text-[11px] text-slate-500">카드 개발·교환·사절 등 세부 행동은 아직 구현되지 않았습니다.</p>
    </div>
  `;

  container.querySelector('#ns-end-turn')?.addEventListener('click', () => ctx.dispatch({ type: 'end_turn' }));
  container.querySelector('#ns-declare-end')?.addEventListener('click', () => ctx.dispatch({ type: 'declare_end' }));
}
