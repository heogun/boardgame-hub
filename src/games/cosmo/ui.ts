import './cosmo.css';
import type { RenderContext } from '../../framework/types';
import type { CosmoGameState, CosmoCard, CosmoHandResult } from './types';
import { evaluateHand } from './game';

export type CosmoAction =
  | { type: 'draw'; deckIndex: number; reveal: boolean }
  | { type: 'bet'; amount: number; target: 'self' | 'opponent'; targetPlayerId?: string }
  | { type: 'pass' };

export interface CosmoLocal {
  selectedDeck: number | null;
}

type Ctx = RenderContext<CosmoAction, CosmoLocal>;

// render 동안만 쓰는 이름 조회 (HTML 이스케이프됨)
let nameOf: (id: string | null | undefined) => string = (id) => id ?? '?';

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
        <span class="cm-player-name">${isMyself ? '나' : `${nameOf(playerId)}`}</span>
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
    return `<div class="cm-waiting">${nameOf(gs.currentTurn)}의 베팅을 기다리는 중...</div>`;
  }

  if (myPlayer.hasBet) {
    return '<div class="cm-waiting">베팅 완료. 상대방의 결정을 기다리는 중...</div>';
  }

  const otherPlayers = gs.playerOrder.filter((id) => id !== myId);
  const targetOptions = otherPlayers
    .map((id) => `<option value="${id}">${nameOf(id)}</option>`)
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
    return `<div class="cm-waiting">${nameOf(gs.currentTurn)}의 차례를 기다리는 중...</div>`;
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
        <div class="cm-result-name">${nameOf(r.id)}</div>
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
        <p>승자: ${nameOf(gs.winner)}</p>
        <p>${gs.winnerReason}</p>
      </div>
    </div>
  `;
}

export function renderCosmo(container: HTMLElement, gs: CosmoGameState, ctx: Ctx) {
  nameOf = ctx.playerName;
  const myId = ctx.myId;
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
    <div class="px-4 pt-3 flex items-center gap-3 text-xs">
      ${gs.phase === 'game_over' ? '' : `<span class="px-2 py-0.5 rounded ${isMyTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}">${isMyTurn ? '내 턴' : `${nameOf(gs.currentTurn)}의 턴`}</span>`}
      <span class="text-slate-500">라운드 ${gs.round}/${gs.maxRounds}</span>
      <span class="text-slate-500">팟: ${gs.pot}★</span>
    </div>
    <div class="flex flex-col p-4 gap-4">
      <div class="cm-players">${playersHtml}</div>
      <div class="cm-phase-area">${phaseHtml}</div>
    </div>
  `;

  if (gs.phase === 'drawing') attachDrawingEvents(container, gs, ctx);
  else if (gs.phase === 'betting') attachBettingEvents(container, gs, ctx);
}

function attachDrawingEvents(container: HTMLElement, gs: CosmoGameState, ctx: Ctx) {
  if (gs.currentTurn !== ctx.myId) return;
  const options = container.querySelector<HTMLElement>('#cm-draw-options');

  const applySelection = () => {
    container.querySelectorAll('.cm-deck').forEach((d) => {
      d.classList.toggle('cm-selected', Number(d.getAttribute('data-deck')) === ctx.local.selectedDeck);
    });
    if (options) options.style.display = ctx.local.selectedDeck === null ? 'none' : 'block';
  };
  applySelection();

  container.querySelectorAll('.cm-deck').forEach((deck) => {
    deck.addEventListener('click', () => {
      const deckIndex = Number(deck.getAttribute('data-deck'));
      if (!(deckIndex >= 0) || gs.decks[deckIndex].length === 0) return;
      ctx.local.selectedDeck = deckIndex;
      applySelection();
    });
  });

  const draw = (reveal: boolean) => {
    if (ctx.local.selectedDeck === null) return;
    ctx.dispatch({ type: 'draw', deckIndex: ctx.local.selectedDeck, reveal });
    ctx.local.selectedDeck = null;
  };
  container.querySelector('#cm-reveal-btn')?.addEventListener('click', () => draw(true));
  container.querySelector('#cm-hide-btn')?.addEventListener('click', () => draw(false));
}

function attachBettingEvents(container: HTMLElement, gs: CosmoGameState, ctx: Ctx) {
  const myId = ctx.myId;
  if (gs.currentTurn !== myId || gs.players[myId]?.hasBet) return;

  const targetSelect = container.querySelector<HTMLSelectElement>('#cm-bet-target');
  const targetPlayerRow = container.querySelector<HTMLElement>('#cm-target-player-row');
  targetSelect?.addEventListener('change', () => {
    if (targetPlayerRow) targetPlayerRow.style.display = targetSelect.value === 'opponent' ? 'block' : 'none';
  });

  container.querySelector('#cm-bet-btn')?.addEventListener('click', () => {
    const amount = parseInt(container.querySelector<HTMLInputElement>('#cm-bet-amount')?.value ?? '') || 0;
    const target = (targetSelect?.value ?? 'self') as 'self' | 'opponent';
    const targetPlayerId = target === 'opponent' ? container.querySelector<HTMLSelectElement>('#cm-bet-target-player')?.value : undefined;
    ctx.dispatch({ type: 'bet', amount, target, targetPlayerId });
  });

  container.querySelector('#cm-pass-btn')?.addEventListener('click', () => ctx.dispatch({ type: 'pass' }));
}
