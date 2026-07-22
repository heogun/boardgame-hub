import type { NaishiGameState, NaishiPlayerState, NaishiCard, NSAnyPayload } from '../../types';
import { calculateScore, canDeclareEnd, createInitialGameState } from './game';
import { store } from '../../state/store';
import { syncNaishiStateToAll } from './networking';
import { logSystem } from '../../ui/utils/log';

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
  const emoji = CARD_EMOJI[card.type] || '?';
  const selectedClass = selected ? 'ns-selected' : '';
  const interactiveClass = interactive ? 'ns-interactive' : '';
  return `<div class="ns-card ${selectedClass} ${interactiveClass}" data-zone="${zone}" data-index="${index}" data-card-type="${card.type}">${emoji}<br><small>${card.type}</small></div>`;
}

function renderPlayerArea(playerId: string, player: NaishiPlayerState, isCurrentPlayer: boolean, currentUserId: string): string {
  const isActive = isCurrentPlayer && playerId === currentUserId;
  const zoneClass = isActive ? 'ns-zone-active' : '';
  const label = playerId === currentUserId ? 'You' : 'Opponent';

  return `
    <div class="ns-player-area ${zoneClass}" data-player="${playerId}">
      <h3>${label} ${isCurrentPlayer ? '(Turn)' : ''}</h3>
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
  if (gs.currentPlayer !== currentUserId) return '<p>Waiting for opponent...</p>';
  if (gs.phase === 'game_over') {
    const myScore = calculateScore(gs, currentUserId);
    const otherId = Object.keys(gs.players).find((id) => id !== currentUserId) || '';
    const otherScore = calculateScore(gs, otherId);
    const winner = myScore > otherScore ? 'You win!' : myScore < otherScore ? 'Opponent wins!' : 'Draw!';
    return `<div class="ns-result"><h3>Game Over!</h3><p>${winner} (${myScore} vs ${otherScore})</p><button id="ns-return-lobby">Return to Lobby</button></div>`;
  }

  return `
    <div class="ns-actions">
      <button id="ns-end-turn">End Turn</button>
      ${canDeclareEnd(gs) ? '<button id="ns-declare-end">Declare End</button>' : ''}
      <button id="ns-recall-emissaries">Recall Emissaries</button>
    </div>
  `;
}

export function renderNaishi(container: HTMLElement, gs: NaishiGameState, currentUserId: string): void {
  const { currentPlayer } = gs;
  const playerIds = Object.keys(gs.players);

  container.innerHTML = `
    <div class="ns-game">
      <h2>Naishi</h2>
      ${playerIds.map((id) => renderPlayerArea(id, gs.players[id], id === currentPlayer, currentUserId)).join('')}
      ${renderRiver(gs, currentPlayer === currentUserId)}
      ${renderActions(gs, currentUserId)}
    </div>
  `;
}

export function handleNSMessage(_gs: NaishiGameState, _senderId: string, payload: NSAnyPayload): void {
  if (payload.type === 'NS_STATE_SYNC') {
    store.naishi = payload.gs;
    return;
  }
}

export function startNaishiGame() {
  const playerIds = store.gameState.players.map((p) => p.id);
  if (playerIds.length < 2) {
    logSystem('Need at least 2 players to start Naishi');
    return;
  }
  store.naishi = createInitialGameState(playerIds[0], playerIds[1]);
  store.currentScreen = 'game-naishi';

  if (store.isHost) {
    syncNaishiStateToAll();
  }
  logSystem('나이시 게임을 시작합니다!');
}

export function initNaishiScreen() {
  if (store.naishi && store.myId) {
    renderNaishi(
      document.getElementById('game-naishi-content')!,
      store.naishi,
      store.myId,
    );
  }
}
