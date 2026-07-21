export function updateScreen(screen: string) {
  const lobby = document.getElementById('screen-lobby')!;
  const room = document.getElementById('screen-room')!;
  lobby.classList.add('hidden-screen');
  room.classList.add('hidden-screen');
  document.getElementById(`screen-${screen}`)!.classList.remove('hidden-screen');
}

export function setLoading(isLoading: boolean, text = '처리 중...') {
  const overlay = document.getElementById('lobby-loading')!;
  const textEl = document.getElementById('lobby-loading-text')!;
  if (isLoading) {
    textEl.textContent = text;
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

export function getEl<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
