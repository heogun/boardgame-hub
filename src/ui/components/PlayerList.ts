import { store } from '../../state/store';
import { updateGameModuleAvailability } from './GameModuleCard';
import { updateStartButton } from '../room';

export function renderPlayerList() {
  const list = document.getElementById('player-list')!;
  const count = document.getElementById('player-count')!;
  count.textContent = String(store.gameState.players.length);

  list.innerHTML = store.gameState.players
    .map((p) => {
      const isMe = p.id === store.myId;
      const roleBadge = p.isHost
        ? `<span class="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-bold">HOST</span>`
        : '';
      const meBadge = isMe
        ? `<span class="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-bold">ME</span>`
        : '';
      return `
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
              ${p.name.charAt(0).toUpperCase()}
            </div>
            <span class="text-sm font-medium ${isMe ? 'text-white' : 'text-slate-300'}">${p.name}</span>
          </div>
          <div class="flex gap-1">
            ${roleBadge}
            ${meBadge}
          </div>
        </div>
      `;
    })
    .join('');

  updateGameModuleAvailability();
  updateStartButton();
}
