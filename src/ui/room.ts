import { store } from '../state/store';
import { broadcastToClients } from '../networking/sync';
import { sendActionToHost } from '../networking/host';
import { leaveRoom } from '../networking/client';
import { logSystem } from './utils/log';
import { showToast } from './utils/toast';
import { copyToClipboard } from './utils/clipboard';
import { hostStartGame } from '../framework/session';
import { renderGameSelector } from './components/GameModuleCard';

export function initRoomEvents() {
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

  document.getElementById('btn-start-game')!.addEventListener('click', onStartGame);
  renderGameSelector();
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

function onStartGame() {
  const err = hostStartGame();
  if (err) showToast(err, 'error');
}
