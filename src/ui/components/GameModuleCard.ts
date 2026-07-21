import { store } from '../../state/store';

export function updateGameModuleAvailability() {
  const playerCount = store.gameState.players.length;
  const moduleCards = document.querySelectorAll<HTMLDivElement>('.game-module-card');
  const warningEl = document.getElementById('module-warning')!;

  moduleCards.forEach((card) => {
    const min = parseInt(card.getAttribute('data-min') || '1');
    const max = parseInt(card.getAttribute('data-max') || '10');
    const gameName = card.getAttribute('data-game')!;

    if (playerCount >= min && playerCount <= max) {
      card.classList.remove('opacity-40', 'cursor-not-allowed', 'border-slate-700');
      card.classList.add('cursor-pointer');
      if (gameName === store.gameState.selectedGame) {
        card.className =
          'game-module-card border border-indigo-500 bg-indigo-500/10 p-4 rounded-xl cursor-pointer transition-all';
      } else {
        card.className =
          'game-module-card border border-slate-700 bg-slate-800/50 p-4 rounded-xl cursor-pointer hover:bg-slate-700 transition-all';
      }
    } else {
      card.classList.add('opacity-40', 'cursor-not-allowed', 'border-slate-700');
      card.classList.remove('cursor-pointer', 'border-indigo-500', 'bg-indigo-500/10', 'hover:bg-slate-700');
      if (gameName === store.gameState.selectedGame && store.isHost) {
        store.updateGameState({ selectedGame: 'tictactoe' });
      }
    }
  });

  const level10Card = document.getElementById('card-module-level10')!;
  warningEl.classList.toggle('hidden', !level10Card.classList.contains('opacity-40'));
}

export function updateClientSelectionStyle(selectedGame: string) {
  document.querySelectorAll<HTMLDivElement>('.game-module-card').forEach((card) => {
    const g = card.getAttribute('data-game');
    if (g === selectedGame) {
      card.className =
        'game-module-card border border-indigo-500 bg-indigo-500/10 p-4 rounded-xl transition-all';
    } else if (!card.classList.contains('opacity-40')) {
      card.className =
        'game-module-card border border-slate-700 bg-slate-800/50 p-4 rounded-xl transition-all';
    }
  });
}
