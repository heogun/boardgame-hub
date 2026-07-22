import type { CardiaGameState, CardiaEncounter, CDAnyPayload } from '../../types';
import { getCard, createInitialGameState } from './game';
import { store } from '../../state/store';
import { syncCadiaStateToAll } from './networking';
import { logSystem } from '../../ui/utils/log';

const FACTION_EMOJI: Record<string, string> = {
  rebellion: '⚔️',
  academy: '📚',
  guild: '⚙️',
  dynasty: '👑',
};

function renderCard(influence: number, selected: boolean, interactive: boolean): string {
  const card = getCard(influence);
  const emoji = FACTION_EMOJI[card.faction] || '?';
  const selectedClass = selected ? 'cd-selected' : '';
  const interactiveClass = interactive ? 'cd-interactive' : '';
  return `<div class="cd-card ${selectedClass} ${interactiveClass}" data-influence="${influence}">
    <div class="cd-card-number">${influence}</div>
    <div class="cd-card-name">${card.name}</div>
    <div class="cd-card-faction">${emoji} ${card.faction}</div>
  </div>`;
}

function renderEncounter(encounter: CardiaEncounter, _index: number): string {
  const p1Card = getCard(encounter.player1Card + 1);
  const p2Card = getCard(encounter.player2Card + 1);

  const p1Class = encounter.player1Signet ? 'cd-winner' : '';
  const p2Class = encounter.player2Signet ? 'cd-winner' : '';

  return `
    <div class="cd-encounter">
      <div class="cd-encounter-card ${p1Class}">
        <div class="cd-card-number">${encounter.player1Card + 1}</div>
        <div class="cd-card-name">${p1Card.name}</div>
      </div>
      <div class="cd-encounter-vs">VS</div>
      <div class="cd-encounter-card ${p2Class}">
        <div class="cd-card-number">${encounter.player2Card + 1}</div>
        <div class="cd-card-name">${p2Card.name}</div>
      </div>
    </div>
  `;
}

function renderHand(hand: number[], _currentUserId: string, isCurrentPlayer: boolean): string {
  return `
    <div class="cd-hand">
      ${hand.map((influence) => renderCard(influence, false, isCurrentPlayer)).join('')}
    </div>
  `;
}

function renderActions(gs: CardiaGameState, currentUserId: string): string {
  if (gs.phase === 'game_over') {
    const winnerId = gs.winner;
    const winnerText = winnerId === currentUserId ? 'You win!' : 'Opponent wins!';
    return `<div class="cd-result"><h3>Game Over!</h3><p>${winnerText}</p><button id="cd-return-lobby">Return to Lobby</button></div>`;
  }

  if (gs.currentPlayer !== currentUserId) {
    return '<p>Waiting for opponent...</p>';
  }

  return `
    <div class="cd-actions">
      <button id="cd-play-card" disabled>Play Selected Card</button>
      <p>Select a card from your hand to play</p>
    </div>
  `;
}

function renderGameState(gs: CardiaGameState, currentUserId: string): string {
  const playerIds = Object.keys(gs.players);
  const currentPlayer = gs.currentPlayer;

  return `
    <div class="cd-game">
      <h2>Duel for Cardia</h2>
      <div class="cd-scoreboard">
        ${playerIds.map((id) => `
          <div class="cd-player-score ${id === currentUserId ? 'cd-you' : ''}">
            <span>${id === currentUserId ? 'You' : 'Opponent'}:</span>
            <span class="cd-signets">${gs.signets[id] || 0} Signets</span>
          </div>
        `).join('')}
      </div>
      <div class="cd-encounters">
        <h3>Encounters</h3>
        ${gs.encounters.map((enc, i) => renderEncounter(enc, i)).join('')}
      </div>
      ${playerIds.map((id) => `
        <div class="cd-player-area ${id === currentUserId ? 'cd-you' : ''}">
          <h3>${id === currentUserId ? 'Your Hand' : 'Opponent\'s Hand'}</h3>
          ${id === currentUserId
            ? renderHand(gs.players[id].hand, currentUserId, id === currentPlayer)
            : `<div class="cd-hidden-cards">${gs.players[id].hand.length} cards</div>`
          }
        </div>
      `).join('')}
      ${renderActions(gs, currentUserId)}
    </div>
  `;
}

export function renderCadia(container: HTMLElement, gs: CardiaGameState, currentUserId: string): void {
  container.innerHTML = renderGameState(gs, currentUserId);

  if (gs.phase === 'game_over') {
    const btn = container.querySelector('#cd-return-lobby');
    if (btn) {
      btn.addEventListener('click', () => {
        syncCadiaStateToAll();
      });
    }
    return;
  }

  if (gs.currentPlayer !== currentUserId) return;

  let selectedCard: number | null = null;
  const cards = container.querySelectorAll('.cd-card');

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const influence = parseInt(card.getAttribute('data-influence') || '0');
      if (influence === 0) return;

      cards.forEach((c) => c.classList.remove('cd-selected'));
      card.classList.add('cd-selected');
      selectedCard = influence;

      const playBtn = container.querySelector('#cd-play-card') as HTMLButtonElement;
      if (playBtn) {
        playBtn.disabled = false;
      }
    });
  });

  const playBtn = container.querySelector('#cd-play-card');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (selectedCard === null) return;

      const player = store.cadia?.players[currentUserId];
      if (!player) return;

      const cardIndex = player.hand.indexOf(selectedCard);
      if (cardIndex === -1) return;

      const newHand = [...player.hand];
      newHand.splice(cardIndex, 1);

      if (store.cadia) {
        const newGs = {
          ...store.cadia,
          players: {
            ...store.cadia.players,
            [currentUserId]: {
              ...player,
              hand: newHand,
            },
          },
          encounters: [
            ...store.cadia.encounters,
            {
              player1Card: selectedCard - 1,
              player2Card: 0,
              player1Signet: false,
              player2Signet: false,
              player1Modifiers: [],
              player2Modifiers: [],
              ongoingTokens: [],
            },
          ],
        };

        store.cadia = newGs;
        syncCadiaStateToAll();
      }
    });
  }
}

export function handleCDMessage(_gs: CardiaGameState, _senderId: string, payload: CDAnyPayload): void {
  if (payload.type === 'CD_STATE_SYNC') {
    store.cadia = payload.gs;
    return;
  }
}

export function startCadiaGame() {
  const playerIds = store.gameState.players.map((p) => p.id);
  if (playerIds.length < 2) {
    logSystem('Need at least 2 players to start Duel for Cardia');
    return;
  }
  store.cadia = createInitialGameState(playerIds[0], playerIds[1]);
  store.currentScreen = 'game-cadia';

  if (store.isHost) {
    syncCadiaStateToAll();
  }
  logSystem('카르디아 듀얼 게임을 시작합니다!');
}

export function initCadiaScreen() {
  if (store.cadia && store.myId) {
    renderCadia(
      document.getElementById('game-cadia-content')!,
      store.cadia,
      store.myId,
    );
  }
}
