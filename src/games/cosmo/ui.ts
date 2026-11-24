import './cosmo.css';
import { store } from '../../state/store';
import { logSystem } from '../../ui/utils/log';
import { showToast } from '../../ui/utils/toast';
import type { CosmoGameState, CosmoCard, CMAnyPayload, CosmoHandResult } from '../../types';
import { createInitialGameState, drawCard, placeBet, passBet, determineWinner, evaluateHand } from './game';
import { sendCosmoToHost, syncCosmoStateToAll, broadcastCosmo } from './networking';
import { syncStateToAll } from '../../networking/sync';

const SUIT_EMOJI: Record<string, string> = {
  A: '🚀', B: '🛸', C: '🌟', D: '🪐', E: '🌙', F: '☀️',
};

const HAND_RANK_NAMES: Record<string, string> = {
  royal_flush: '로얄 플러시',
  straight_flush: '스트레이트 플러시',
  four_of_a_kind: '포 카드',
  full_house: '풀 하우스',
  flush: '플러시',
  straight: '스트레이트',
  three_of_a_kind: '트리플',
  two_pair: '투 페어',
  one_pair: '원 페어',
  high_card: '하이 카드',
};

function renderCard(card: CosmoCard, faceDown = false, interactive = false): string {
  if (faceDown) {
    return `
      <div class="cm-card cm-card-back ${interactive ? 'cm-interactive' : ''}">
        <div class="cm-card-pattern">?</div>
      </div>
    `;
  }

  const emoji = SUIT_EMOJI[card.suit] || '?';
  return `
    <div class="cm-card ${interactive ? 'cm-interactive' : ''}" data-suit="${card.suit}" data-rank="${card.rank}">
      <div class="cm-card-suit">${emoji}</div>
      <div class="cm-card-rank">${card.rank}</div>
      <div class="cm-card-label">${card.suit}</div>
    </div>
  `;
}

function renderHandResult(result: CosmoHandResult): string {
  const rankName = HAND_RANK_NAMES[result.rank] || result.rank;
  return `
    <div class="cm-hand-result">
      <span class="cm-hand-rank">${rankName}</span>
      <span class="cm-hand-score">(${result.score}점)</span>
    </div>
  `;
}

function renderDeck(deckIndex: number, cardsRemaining: number, interactive: boolean): string {
  const isEmpty = cardsRemaining === 0;
  return `
    <div class="cm-deck ${isEmpty ? 'cm-deck-empty' : ''} ${interactive && !isEmpty ? 'cm-interactive' : ''}" data-deck="${deckIndex}">
      <div class="cm-deck-label">덱 ${deckIndex + 1}</div>
      <div class="cm-deck-count">${cardsRemaining}장</div>
      ${!isEmpty ? '<div class="cm-deck-icon">🂠</div>' : '<div class="cm-deck-icon">✕</div>'}
    </div>
  `;
}

function renderPlayerArea(playerId: string, player: CosmoGameState['players'][string], isCurrentPlayer: boolean, isMyself: boolean, revealAll: boolean): string {
  const showHand = isMyself || revealAll;
  const handResultHtml = showHand && player.hand.length >= 5 ? renderHandResult(evaluateHand(player.hand)) : '';

  const visibleCardsHtml = player.visibleCards.map((card) => renderCard(card)).join('');
  const hiddenCardsHtml = showHand
    ? player.hiddenCards.map((card) => renderCard(card)).join('')
    : player.hiddenCards.map(() => renderCard({ suit: 'A', rank: 1 }, true)).join('');

  const betInfo = player.bet
    ? `<div class="cm-bet-info">베팅: ${player.bet.amount}★ → ${player.bet.target === 'self' ? '자신' : '상대'}</div>`
    : player.hasBet
      ? '<div class="cm-bet-info">패스</div>'
      : '';

  return `
    <div class="cm-player-area ${isMyself ? 'cm-my-area' : 'cm-opponent-area'}">
      <div class="cm-player-header">
        <span class="cm-player-name">${isMyself ? '나' : `플레이어 ${playerId.slice(0, 4)}`}</span>
        <span class="cm-player-money">${player.money}★</span>
        ${isCurrentPlayer ? '<span class="cm-turn-indicator">턴</span>' : ''}
      </div>
      <div class="cm-player-cards">
        <div class="cm-card-group">
          <div class="cm-card-group-label">공개 카드</div>
          <div class="cm-cards">${visibleCardsHtml || '<span class="cm-empty">없음</span>'}</div>
        </div>
        <div class="cm-card-group">
          <div class="cm-card-group-label">숨긴 카드</div>
          <div class="cm-cards">${hiddenCardsHtml || '<span class="cm-empty">없음</span>'}</div>
        </div>
      </div>
      ${handResultHtml}
      ${betInfo}
    </div>
  `;
}

function renderBettingPhase(gs: CosmoGameState, myId: string): string {
  const isMyTurn = gs.currentTurn === myId;
  const myPlayer = gs.players[myId];

  if (!isMyTurn) {
    return '<div class="cm-waiting">상대방의 베팅을 기다리는 중...</div>';
  }

  if (myPlayer.hasBet) {
    return '<div class="cm-waiting">베팅 완료. 상대방의 결정을 기다리는 중...</div>';
  }

  const otherPlayers = gs.playerOrder.filter((id) => id !== myId);
  const targetOptions = otherPlayers
    .map((id) => `<option value="${id}">플레이어 ${id.slice(0, 4)}</option>`)
    .join('');

  return `
    <div class="cm-betting-phase">
      <h3>베팅 단계</h3>
      <div class="cm-bet-form">
        <div class="cm-bet-row">
          <label>베팅 금액:</label>
          <input type="number" id="cm-bet-amount" min="1" max="${myPlayer.money}" value="1" class="cm-input">
          <span>★ (보유: ${myPlayer.money}★)</span>
        </div>
        <div class="cm-bet-row">
          <label>베팅 대상:</label>
          <select id="cm-bet-target" class="cm-select">
            <option value="self">자신 (이길 확률에 베팅)</option>
            <option value="opponent">상대 (지킬 확률에 베팅)</option>
          </select>
        </div>
        <div class="cm-bet-row" id="cm-target-player-row" style="display:none;">
          <label>대상 플레이어:</label>
          <select id="cm-bet-target-player" class="cm-select">
            ${targetOptions}
          </select>
        </div>
        <div class="cm-bet-actions">
          <button id="cm-bet-btn" class="cm-btn cm-btn-primary">베팅하기</button>
          <button id="cm-pass-btn" class="cm-btn cm-btn-secondary">패스</button>
        </div>
      </div>
    </div>
  `;
}

function renderDrawingPhase(gs: CosmoGameState, myId: string): string {
  const isMyTurn = gs.currentTurn === myId;

  if (!isMyTurn) {
    return '<div class="cm-waiting">상대방의 차례를 기다리는 중...</div>';
  }

  const deckHtml = gs.decks
    .map((deck, i) => renderDeck(i, deck.length, isMyTurn))
    .join('');

  return `
    <div class="cm-drawing-phase">
      <h3>카드 뽑기</h3>
      <p>덱을 선택하여 카드를 뽑으세요. 공개할지 숨길지 선택하세요.</p>
      <div class="cm-decks">${deckHtml}</div>
      <div class="cm-draw-options" id="cm-draw-options" style="display:none;">
        <p>이 카드를 어떻게 할까요?</p>
        <button id="cm-reveal-btn" class="cm-btn cm-btn-primary">공개하기</button>
        <button id="cm-hide-btn" class="cm-btn cm-btn-secondary">숨기기</button>
      </div>
    </div>
  `;
}

function renderShowdown(gs: CosmoGameState): string {
  const results = gs.playerOrder.map((id) => ({
    id,
    hand: evaluateHand(gs.players[id].hand),
    player: gs.players[id],
  }));

  results.sort((a, b) => b.hand.score - a.hand.score);

  const resultsHtml = results
    .map((r, i) => `
      <div class="cm-result-player ${i === 0 ? 'cm-winner' : ''}">
        <div class="cm-result-rank">${i + 1}위</div>
        <div class="cm-result-name">플레이어 ${r.id.slice(0, 4)}</div>
        <div class="cm-result-hand">${renderHandResult(r.hand)}</div>
        <div class="cm-result-cards">
          ${r.hand.cards.map((c) => renderCard(c)).join('')}
        </div>
      </div>
    `)
    .join('');

  return `
    <div class="cm-showdown">
      <h3>쇼다운!</h3>
      <div class="cm-results">${resultsHtml}</div>
    </div>
  `;
}

function renderGameOver(gs: CosmoGameState): string {
  return `
    ${renderShowdown(gs)}
    <div class="cm-game-over">
      <h3>게임 종료!</h3>
      <div class="cm-winner-info">
        <p>승자: 플레이어 ${gs.winner?.slice(0, 4)}</p>
        <p>이유: ${gs.winnerReason}</p>
      </div>
      <button id="cm-return-lobby" class="cm-btn cm-btn-primary">대기실로 돌아가기</button>
    </div>
  `;
}

export function renderCosmoScreen(gs: CosmoGameState) {
  const container = document.getElementById('game-cosmo-content')!;
  const myId = store.myId!;
  const isMyTurn = gs.currentTurn === myId;

  let phaseHtml = '';
  switch (gs.phase) {
    case 'drawing':
      phaseHtml = renderDrawingPhase(gs, myId);
      break;
    case 'betting':
      phaseHtml = renderBettingPhase(gs, myId);
      break;
    case 'showdown':
      phaseHtml = renderShowdown(gs);
      break;
    case 'game_over':
      phaseHtml = renderGameOver(gs);
      break;
  }

  const playersHtml = gs.playerOrder
    .map((id) => renderPlayerArea(id, gs.players[id], gs.currentTurn === id, id === myId, gs.phase === 'game_over'))
    .join('');

  container.innerHTML = `
    <header class="bg-slate-800/50 border-b border-slate-700 p-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold uppercase text-slate-400">코스모 (Cosmo)</span>
        <span class="text-xs px-2 py-0.5 rounded ${isMyTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}">
          ${isMyTurn ? '내 턴' : '상대 턴'}
        </span>
        <span class="text-xs text-slate-500">라운드 ${gs.round}/${gs.maxRounds}</span>
        <span class="text-xs text-slate-500">팟: ${gs.pot}★</span>
      </div>
      <button id="btn-cm-leave" class="text-xs px-3 py-1.5 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
        <i class="ph ph-sign-out"></i> 나가기
      </button>
    </header>

    <div class="flex-grow flex flex-col overflow-y-auto p-4 gap-4">
      <div class="cm-players">${playersHtml}</div>
      <div class="cm-phase-area">${phaseHtml}</div>
    </div>
  `;

  attachCosmoEvents(gs);
}

function attachCosmoEvents(gs: CosmoGameState) {
  const leaveBtn = document.getElementById('btn-cm-leave');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => {
      // 진행 중에는 방장만 게임을 끝낼 수 있음 (클라이언트만 나가면 다음 동기화 때 다시 끌려옴)
      if (!store.isHost && gs.phase !== 'game_over') {
        showToast('게임 진행 중에는 방장만 게임을 종료할 수 있습니다.', 'info');
        return;
      }
      returnToLobby();
    });
  }

  const returnBtn = document.getElementById('cm-return-lobby');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => returnToLobby());
  }

  if (gs.phase === 'drawing') {
    attachDrawingEvents(gs);
  } else if (gs.phase === 'betting') {
    attachBettingEvents(gs);
  }
}

function attachDrawingEvents(gs: CosmoGameState) {
  const myId = store.myId!;
  if (gs.currentTurn !== myId) return;

  let selectedDeck: number | null = null;

  document.querySelectorAll('.cm-deck').forEach((deck) => {
    deck.addEventListener('click', () => {
      const deckIndex = parseInt(deck.getAttribute('data-deck') || '-1');
      if (deckIndex < 0 || gs.decks[deckIndex].length === 0) return;

      selectedDeck = deckIndex;
      document.querySelectorAll('.cm-deck').forEach((d) => d.classList.toggle('cm-selected', d === deck));
      document.getElementById('cm-draw-options')?.style.setProperty('display', 'block');
    });
  });

  const revealBtn = document.getElementById('cm-reveal-btn');
  if (revealBtn) {
    revealBtn.addEventListener('click', () => {
      if (selectedDeck === null) return;
      sendCosmoToHost({ type: 'CM_DRAW_CARD', deckIndex: selectedDeck, reveal: true });
    });
  }

  const hideBtn = document.getElementById('cm-hide-btn');
  if (hideBtn) {
    hideBtn.addEventListener('click', () => {
      if (selectedDeck === null) return;
      sendCosmoToHost({ type: 'CM_DRAW_CARD', deckIndex: selectedDeck, reveal: false });
    });
  }
}

function attachBettingEvents(gs: CosmoGameState) {
  const myId = store.myId!;
  if (gs.currentTurn !== myId) return;
  if (gs.players[myId].hasBet) return;

  const targetSelect = document.getElementById('cm-bet-target') as HTMLSelectElement;
  const targetPlayerRow = document.getElementById('cm-target-player-row');

  if (targetSelect && targetPlayerRow) {
    targetSelect.addEventListener('change', () => {
      targetPlayerRow.style.display = targetSelect.value === 'opponent' ? 'block' : 'none';
    });
  }

  const betBtn = document.getElementById('cm-bet-btn');
  if (betBtn) {
    betBtn.addEventListener('click', () => {
      const amountInput = document.getElementById('cm-bet-amount') as HTMLInputElement;
      const target = (document.getElementById('cm-bet-target') as HTMLSelectElement).value as 'self' | 'opponent';
      const targetPlayerId = target === 'opponent'
        ? (document.getElementById('cm-bet-target-player') as HTMLSelectElement).value
        : undefined;

      const amount = parseInt(amountInput.value) || 0;
      if (amount <= 0 || amount > gs.players[myId].money) return;

      sendCosmoToHost({
        type: 'CM_BET',
        amount,
        target,
        targetPlayerId,
      });
    });
  }

  const passBtn = document.getElementById('cm-pass-btn');
  if (passBtn) {
    passBtn.addEventListener('click', () => {
      sendCosmoToHost({ type: 'CM_PASS' });
    });
  }
}

function returnToLobby() {
  if (store.isHost) {
    broadcastCosmo({ type: 'CM_RETURN_TO_LOBBY' });
    store.updateGameState({ status: 'LOBBY' });
    syncStateToAll();
  }
  store.cosmo = null;
  store.currentScreen = 'room';
  logSystem('게임이 종료되었습니다. 대기실로 돌아갑니다.');
}

export function handleCosmoMessage(_senderId: string, payload: CMAnyPayload) {
  const gs = store.cosmo;
  if (!gs) return;

  switch (payload.type) {
    case 'CM_DRAW_CARD': {
      if (!store.isHost) return;
      const newGs = drawCard(gs, _senderId, payload.deckIndex, payload.reveal);
      store.cosmo = newGs;
      syncCosmoStateToAll();
      break;
    }

    case 'CM_BET': {
      if (!store.isHost) return;
      const newGs = placeBet(gs, _senderId, payload.amount, payload.target, payload.targetPlayerId);
      store.cosmo = newGs;

      if (newGs.phase === 'showdown') {
        const finalGs = determineWinner(newGs);
        store.cosmo = finalGs;
      }

      syncCosmoStateToAll();
      break;
    }

    case 'CM_PASS': {
      if (!store.isHost) return;
      const newGs = passBet(gs, _senderId);
      store.cosmo = newGs;

      if (newGs.phase === 'showdown') {
        const finalGs = determineWinner(newGs);
        store.cosmo = finalGs;
      }

      syncCosmoStateToAll();
      break;
    }

    case 'CM_STATE_SYNC':
      store.cosmo = payload.gs;
      renderCosmoScreen(payload.gs);
      break;

    case 'CM_RETURN_TO_LOBBY':
      store.currentScreen = 'room';
      store.cosmo = null;
      logSystem('방장이 게임을 종료했습니다. 대기실로 돌아갑니다.');
      break;
  }
}

export function startCosmoGame() {
  const playerIds = store.gameState.players.map((p) => p.id);
  if (playerIds.length < 2) {
    logSystem('코스모 게임은 최소 2명의 플레이어가 필요합니다.');
    return;
  }

  store.cosmo = createInitialGameState(playerIds);
  store.currentScreen = 'game-cosmo';

  if (store.isHost) {
    syncCosmoStateToAll();
  }
  logSystem('코스모 게임을 시작합니다!');
}

export function initCosmoScreen() {
  if (store.cosmo) {
    renderCosmoScreen(store.cosmo);
  }
}
