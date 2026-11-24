const SCREENS = ['lobby', 'room', 'game-level10', 'game-buffalo', 'game-dracula', 'game-naishi', 'game-cadia', 'game-cosmo'];

export function updateScreen(screen: string) {
  SCREENS.forEach((s) => {
    const el = document.getElementById(`screen-${s}`);
    if (el) {
      el.classList.toggle('hidden-screen', s !== screen);
    }
  });
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
