import { store } from '../state/store';
import { broadcastToClients, syncStateToAll } from '../networking/sync';
import { sendActionToHost } from '../networking/host';
import { leaveRoom } from '../networking/client';
import { logSystem } from './utils/log';
import { showToast } from './utils/toast';
import { copyToClipboard } from './utils/clipboard';

export function initRoomEvents() {
  document.querySelectorAll('.game-module-card').forEach((card) => {
    card.addEventListener('click', () => onGameModuleClick(card as HTMLDivElement));
  });

  document.getElementById('btn-send-chat')!.addEventListener('click', handleSendChat);
  document.getElementById('input-chat')!.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendChat();
  });

  document.getElementById('btn-leave-room')!.addEventListener('click', () => {
    leaveRoom();
  });

  document.getElementById('btn-copy-room')!.addEventListener('click', () => {
    if (store.roomId) {
      copyToClipboard(store.roomId, '방 ID');
    }
  });
}

function onGameModuleClick(card: HTMLDivElement) {
  if (!store.isHost) {
    showToast('게임 모듈 선택은 방장만 가능합니다.', 'info');
    return;
  }
  if (card.classList.contains('opacity-40')) {
    showToast('현재 인원수가 조건에 맞지 않아 선택할 수 없습니다.', 'error');
    return;
  }

  const selectedGame = card.getAttribute('data-game')!;
  store.updateGameState({ selectedGame });
  syncStateToAll();

  document.querySelectorAll('.game-module-card').forEach((c) => {
    if (!c.classList.contains('opacity-40')) {
      (c as HTMLDivElement).className =
        'game-module-card border border-slate-700 bg-slate-800/50 p-4 rounded-xl cursor-pointer hover:bg-slate-700 transition-all';
    }
  });
  card.className =
    'game-module-card border border-indigo-500 bg-indigo-500/10 p-4 rounded-xl cursor-pointer transition-all';
}

function handleSendChat() {
  const input = document.getElementById('input-chat') as HTMLInputElement;
  const msg = input.value.trim();
  if (!msg) return;

  if (store.isHost) {
    logSystem(msg, false, store.myName);
    broadcastToClients({ type: 'EVENT_CHAT', senderName: store.myName, message: msg });
  } else {
    sendActionToHost({ type: 'ACTION_CHAT', message: msg });
  }

  input.value = '';
}
