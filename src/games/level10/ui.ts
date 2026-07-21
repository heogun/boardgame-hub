import { store } from '../../state/store';
import { logSystem } from '../../ui/utils/log';
import type { Level10GameState, L10AnyPayload } from '../../types';
import { getMyHand, playCard, useThrowingStar, createInitialGameState } from './game';
import { broadcastL10, sendL10ToHost, syncL10StateToAll } from './networking';

let pendingStarVotes: Set<string> = new Set();

export function renderLevel10Screen(gs: Level10GameState) {
  const container = document.getElementById('game-level10-content')!;
  const myHand = getMyHand(gs, store.myId!);

  const totalCards = gs.players.reduce((s, h) => s + h.cards.length, 0);
  const playedCount = gs.centerPile.length;
  const centerLabel = totalCards > 0 ? `${playedCount} / ${totalCards}` : '';

  container.innerHTML = `
    <header class="bg-slate-800/50 border-b border-slate-700 p-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold uppercase text-slate-400">레벨 ${gs.currentLevel} / ${gs.maxLevel}</span>
        <div class="flex items-center gap-2">
          <span class="flex items-center gap-1 text-xs"><i class="ph ph-heart-straight text-red-400"></i> ${gs.lives}</span>
          <span class="flex items-center gap-1 text-xs"><i class="ph ph-star text-yellow-400"></i> ${gs.throwingStars}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        ${gs.blindMode ? '<span class="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">BLIND</span>' : ''}
        <button id="btn-l10-leave" class="text-xs px-3 py-1.5 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
          <i class="ph ph-sign-out"></i> 나가기
        </button>
      </div>
    </header>

    <div class="flex-grow flex flex-col overflow-hidden p-4 gap-4">
      <div class="flex justify-center gap-2">
        ${gs.players.map((h) => {
          const p = store.gameState.players.find((pl) => pl.id === h.playerId);
          const name = p ? p.name : '?';
          const isMe = h.playerId === store.myId;
          return `<div class="text-xs px-3 py-1 rounded-full ${isMe ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
            ${name} (${h.cards.length})
          </div>`;
        }).join('')}
      </div>

      <div class="flex-1 flex flex-col items-center justify-center gap-3">
        ${gs.phase === 'concentration' ? `
          <div class="text-center">
            <i class="ph ph-hand-eye text-5xl text-indigo-400 mb-3 block animate-pulse"></i>
            <p class="text-slate-300 font-medium">레벨 ${gs.currentLevel} 준비</p>
            <p class="text-xs text-slate-500 mt-1">준비되면 아래 버튼을 눌러주세요</p>
            <button id="btn-l10-ready" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all text-lg">
              준비 완료!
            </button>
          </div>
        ` : gs.phase === 'error_pause' ? `
          <div class="text-center bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <i class="ph ph-warning-circle text-4xl text-red-400 mb-2 block"></i>
            <p class="text-red-200 font-bold text-lg">순서 오류!</p>
            <p class="text-red-300/80 text-sm mt-1">${gs.errorCard} 은(는) 지금 낼 수 없는 카드입니다</p>
            <p class="text-xs text-slate-400 mt-2">낮은 카드가 버려졌습니다. 계속 진행하려면 클릭</p>
            <button id="btn-l10-resume" class="mt-3 bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors">
              계속하기
            </button>
          </div>
        ` : gs.phase === 'level_complete' ? `
          <div class="text-center bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
            <i class="ph ph-check-circle text-4xl text-emerald-400 mb-2 block"></i>
            <p class="text-emerald-200 font-bold text-lg">레벨 ${gs.currentLevel} 클리어!</p>
            <p class="text-xs text-slate-400 mt-2">다음 레벨로 이동합니다</p>
          </div>
        ` : gs.phase === 'game_over_victory' ? `
          <div class="text-center bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8">
            <i class="ph ph-trophy text-5xl text-yellow-400 mb-3 block"></i>
            <p class="text-yellow-200 font-bold text-2xl">승리!</p>
            <p class="text-slate-300 mt-2">모든 레벨을 클리어했습니다!</p>
            <button id="btn-l10-return" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors">
              대기실로 돌아가기
            </button>
          </div>
        ` : gs.phase === 'game_over_defeat' ? `
          <div class="text-center bg-red-500/10 border border-red-500/30 rounded-xl p-8">
            <i class="ph ph-skull text-5xl text-red-400 mb-3 block"></i>
            <p class="text-red-200 font-bold text-2xl">패배...</p>
            <p class="text-slate-300 mt-2">모든 생명을 잃었습니다</p>
            <button id="btn-l10-return" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors">
              대기실로 돌아가기
            </button>
          </div>
        ` : `
          <div class="flex flex-wrap justify-center gap-2 mb-2">
            ${gs.centerPile.map((v) => `<span class="w-10 h-14 bg-indigo-500/20 border border-indigo-500/40 rounded-lg flex items-center justify-center text-sm font-bold text-indigo-300">${v}</span>`).join('')}
          </div>
          ${centerLabel ? `<p class="text-xs text-slate-500">${centerLabel}</p>` : ''}
        `}
      </div>

      ${
        gs.phase === 'playing' || gs.phase === 'concentration' || gs.phase === 'error_pause'
          ? `
        <div class="flex justify-center gap-2 flex-wrap">
          ${gs.phase === 'playing'
            ? [...(store.isHost ? ['<button id="btn-l10-suggest-star" class="text-xs px-3 py-1.5 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded-lg border border-yellow-600/30 transition-colors"><i class="ph ph-star"></i> 별 제안</button>'] : []),
              '<button id="btn-l10-pause" class="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"><i class="ph ph-pause"></i> 일시정지</button>',
            ].join('') : ''}
        </div>
        ` : ''
      }

      ${
        gs.phase === 'playing' && myHand.length > 0
          ? `
        <div class="shrink-0">
          <p class="text-xs text-slate-500 mb-2 text-center">내 카드 (가장 작은 카드부터 내세요)</p>
          <div class="flex justify-center gap-2 flex-wrap">
            ${myHand.map((c, i) => `
              <button class="l10-card-btn w-14 h-20 rounded-xl text-lg font-bold transition-all duration-150
                ${i === 0
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }"
                data-value="${c}"
                ${i === 0 ? '' : 'disabled'}
              >${c}</button>
            `).join('')}
          </div>
        </div>
        ` : ''
      }
    </div>
  `;

  attachLevel10Events(gs);
}

function attachLevel10Events(_gs: Level10GameState) {
  document.querySelectorAll('.l10-card-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = parseInt(btn.getAttribute('data-value')!);
      sendL10ToHost({ type: 'L10_CARD_PLAY', value });
    });
  });

  const readyBtn = document.getElementById('btn-l10-ready');
  if (readyBtn) {
    readyBtn.addEventListener('click', () => {
      sendL10ToHost({ type: 'L10_READY' });
    });
  }

  const resumeBtn = document.getElementById('btn-l10-resume');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      sendL10ToHost({ type: 'L10_RESUME' });
    });
  }

  const pauseBtn = document.getElementById('btn-l10-pause');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      sendL10ToHost({ type: 'L10_PAUSE' });
    });
  }

  const suggestStarBtn = document.getElementById('btn-l10-suggest-star');
  if (suggestStarBtn) {
    suggestStarBtn.addEventListener('click', () => {
      broadcastL10({ type: 'L10_SUGGEST_STAR', suggesterId: store.myId! });
    });
  }

  const leaveBtn = document.getElementById('btn-l10-leave');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => {
      returnToLobby();
    });
  }

  const returnBtn = document.getElementById('btn-l10-return');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      returnToLobby();
    });
  }
}

function returnToLobby() {
  store.currentScreen = 'room';
  store.l10 = null;
  logSystem('게임이 종료되었습니다. 대기실로 돌아갑니다.');
  if (store.isHost) {
    const payload: L10AnyPayload = { type: 'L10_RETURN_TO_LOBBY' };
    broadcastL10(payload);
    store.updateGameState({ status: 'LOBBY' });
    syncL10StateToAll();
  }
}

function showStarVoteModal(suggesterId: string) {
  const suggester = store.gameState.players.find((p) => p.id === suggesterId);
  const name = suggester ? suggester.name : '누군가';
  const container = document.getElementById('toast-container')!;
  const modal = document.createElement('div');
  modal.id = 'star-vote-modal';
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center">
      <i class="ph ph-star text-4xl text-yellow-400 mb-3 block"></i>
      <p class="text-lg font-bold text-white mb-1">별을 사용할까요?</p>
      <p class="text-sm text-slate-400 mb-4">${name} 님이 별 사용을 제안했습니다</p>
      <p class="text-xs text-slate-500 mb-4">모든 플레이어가 동의하면 가장 낮은 카드가 버려집니다</p>
      <div class="flex gap-3 justify-center">
        <button id="btn-star-yes" class="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-6 py-2 rounded-lg transition-colors">동의</button>
        <button id="btn-star-no" class="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors">취소</button>
      </div>
    </div>
  `;
  container.appendChild(modal);

  document.getElementById('btn-star-yes')!.addEventListener('click', () => {
    sendL10ToHost({ type: 'L10_STAR_VOTE', agree: true });
    modal.remove();
  });
  document.getElementById('btn-star-no')!.addEventListener('click', () => {
    sendL10ToHost({ type: 'L10_STAR_VOTE', agree: false });
    modal.remove();
  });
}

export function handleLevel10Message(senderId: string, payload: L10AnyPayload) {
  const gs = store.l10;
  if (!gs) return;

  switch (payload.type) {
    case 'L10_CARD_PLAY': {
      if (!store.isHost) return;
      const { gs: newGs, valid } = playCard(gs, senderId, payload.value);
      store.l10 = newGs;
      syncL10StateToAll();
      if (!valid) {
        broadcastL10({ type: 'L10_ERROR', playedValue: payload.value, lowerCards: [] });
      }
      break;
    }

    case 'L10_READY': {
      if (!store.isHost) return;
      broadcastL10({ type: 'L10_STATE_SYNC', gs: { ...gs, phase: 'playing' } });
      store.l10 = { ...gs, phase: 'playing' };
      break;
    }

    case 'L10_PAUSE': {
      broadcastL10({ type: 'L10_STATE_SYNC', gs: { ...gs, phase: 'concentration' } });
      store.l10 = { ...gs, phase: 'concentration' };
      break;
    }

    case 'L10_RESUME': {
      if (!store.isHost) return;
      broadcastL10({ type: 'L10_STATE_SYNC', gs: { ...gs, phase: 'playing' } });
      store.l10 = { ...gs, phase: 'playing' };
      break;
    }

    case 'L10_SUGGEST_STAR': {
      showStarVoteModal(senderId);
      break;
    }

    case 'L10_STAR_VOTE': {
      if (!store.isHost) return;
      if (payload.agree) {
        pendingStarVotes.add(senderId);
      }
      const allPlayers = store.gameState.players.length;
      const readyCount = pendingStarVotes.size;
      if (readyCount >= allPlayers) {
        pendingStarVotes.clear();
        const newGs = useThrowingStar(gs);
        store.l10 = newGs;
        syncL10StateToAll();
      }
      break;
    }

    case 'L10_STATE_SYNC':
      store.l10 = payload.gs;
      renderLevel10Screen(payload.gs);
      break;

    case 'L10_ERROR':
      if (store.isHost) break;
      break;

    case 'L10_RETURN_TO_LOBBY':
      store.currentScreen = 'room';
      store.l10 = null;
      logSystem('방장이 게임을 종료했습니다. 대기실로 돌아갑니다.');
      break;
  }
}

export function startLevel10Game() {
  const playerIds = store.gameState.players.map((p) => p.id);
  const playerCount = playerIds.length;

  store.l10 = createInitialGameState(playerIds, playerCount);
  store.currentScreen = 'game-level10';

  if (store.isHost) {
    syncL10StateToAll();
  }
  logSystem('레벨 10 게임을 시작합니다!');
}

export function initLevel10Screen() {
  if (store.l10) {
    renderLevel10Screen(store.l10);
  }
}
