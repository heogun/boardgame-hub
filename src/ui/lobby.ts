import { store } from '../state/store';
import { startHost } from '../networking/host';
import { joinRoom } from '../networking/client';
import { setLoading } from './utils/dom';
import { showToast } from './utils/toast';

export function initLobbyEvents() {
  document.getElementById('btn-create-room')!.addEventListener('click', onCreateRoom);
  document.getElementById('btn-join-room')!.addEventListener('click', onJoinRoom);
}

function onCreateRoom() {
  const nameInput = document.getElementById('input-nickname') as HTMLInputElement;
  const name = nameInput.value.trim();
  if (!name) {
    showToast('닉네임을 입력해주세요.', 'error');
    return;
  }
  store.myName = name;
  document.getElementById('lobby-error')!.classList.add('hidden');
  setLoading(true, 'PeerJS 시그널링 서버 연결 중...');
  startHost().catch(() => {
    setLoading(false);
  });
}

function onJoinRoom() {
  const nameInput = document.getElementById('input-nickname') as HTMLInputElement;
  const roomInput = document.getElementById('input-room-id') as HTMLInputElement;
  const name = nameInput.value.trim();
  let roomId = roomInput.value.trim().toUpperCase();

  if (!name) {
    showToast('닉네임을 입력해주세요.', 'error');
    return;
  }
  if (!roomId) {
    showToast('접속할 방 ID를 입력해주세요.', 'error');
    return;
  }

  if (!roomId.startsWith('ROOM-')) {
    roomId = 'ROOM-' + roomId;
  }

  store.myName = name;
  document.getElementById('lobby-error')!.classList.add('hidden');
  setLoading(true, '방장에 연결 중...');
  joinRoom(roomId);
}
