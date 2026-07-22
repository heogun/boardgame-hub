import type { CardiaGameState, CardiaEncounter, CDAnyPayload, CardiaDeckType } from '../../types';
import { getCard, createInitialGameState, LOCATIONS } from './game';
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

function renderEncounter(encounter: CardiaEncounter, _index: number, deckType: CardiaDeckType): string {
  const p1Card = getCard(encounter.player1Card + 1, deckType);
  const p2Card = getCard(encounter.player2Card + 1, deckType);

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
  const deckLabel = gs.deckType === 'deck2' ? 'Deck II' : 'Deck I';
  const locationLabel = gs.location ? ` (${gs.location.name})` : '';

  return `
    <div class="cd-game">
      <h2>Duel for Cardia - ${deckLabel}${locationLabel}</h2>
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
        ${gs.encounters.map((enc, i) => renderEncounter(enc, i, gs.deckType)).join('')}
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

export function startCadiaGame(deckType: CardiaDeckType = 'deck1', locationId: string | null = null) {
  const playerIds = store.gameState.players.map((p) => p.id);
  if (playerIds.length < 2) {
    logSystem('Need at least 2 players to start Duel for Cardia');
    return;
  }
  const location = locationId ? LOCATIONS.find((l) => l.id === locationId) || null : null;
  store.cadia = createInitialGameState(playerIds[0], playerIds[1], deckType, location);
  store.currentScreen = 'game-cadia';

  if (store.isHost) {
    syncCadiaStateToAll();
  }
  const deckLabel = deckType === 'deck2' ? 'Deck II' : 'Deck I';
  const locationLabel = location ? ` - ${location.name}` : '';
  logSystem(`카르디아 듀얼 게임을 시작합니다! (${deckLabel}${locationLabel})`);
}

export function initCadiaScreen() {
  const container = document.getElementById('game-cadia-content');
  if (!container) return;

  if (store.cadia && store.myId) {
    renderCadia(container, store.cadia, store.myId);
    return;
  }

  if (store.isHost) {
    container.innerHTML = `
      <div class="cd-setup">
        <h2>Duel for Cardia - Game Setup</h2>
        <div class="cd-setup-section">
          <h3>Select Deck</h3>
          <div class="cd-deck-options">
            <label class="cd-option">
              <input type="radio" name="cd-deck" value="deck1" checked>
              <span class="cd-option-label">Deck I</span>
              <span class="cd-option-desc">Standard abilities</span>
            </label>
            <label class="cd-option">
              <input type="radio" name="cd-deck" value="deck2">
              <span class="cd-option-label">Deck II</span>
              <span class="cd-option-desc">Advanced abilities (+1 difficulty)</span>
            </label>
          </div>
        </div>
        <div class="cd-setup-section">
          <h3>Select Location (Optional)</h3>
          <div class="cd-location-options">
            <label class="cd-option">
              <input type="radio" name="cd-location" value="" checked>
              <span class="cd-option-label">No Location</span>
              <span class="cd-option-desc">Standard game</span>
            </label>
            ${LOCATIONS.map((loc) => `
              <label class="cd-option">
                <input type="radio" name="cd-location" value="${loc.id}">
                <span class="cd-option-label">${loc.name}</span>
                <span class="cd-option-desc">${'★'.repeat(loc.stars)} - ${loc.ability}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <button id="cd-start-game" class="cd-start-btn">Start Game</button>
      </div>
    `;

    const startBtn = container.querySelector('#cd-start-game');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const deckRadio = container.querySelector('input[name="cd-deck"]:checked') as HTMLInputElement;
        const locationRadio = container.querySelector('input[name="cd-location"]:checked') as HTMLInputElement;
        const deckType = (deckRadio?.value || 'deck1') as CardiaDeckType;
        const locationId = locationRadio?.value || null;
        startCadiaGame(deckType, locationId);
      });
    }
  } else {
    container.innerHTML = '<p>Waiting for host to start the game...</p>';
  }
}
