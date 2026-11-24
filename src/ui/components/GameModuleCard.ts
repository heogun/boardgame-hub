import { store } from '../../state/store';
import { getGame, isPlayerCountValid, listGames, playerRangeLabel, resolveOptions } from '../../framework/registry';
import { syncStateToAll } from '../../networking/sync';
import { escapeHtml } from '../utils/escape';
import { showToast } from '../utils/toast';

/**
 * 대기실의 게임 선택 영역 (게임 카드, 옵션, 시작 버튼).
 * 등록된 게임 목록에서 자동으로 만들어지므로 게임을 추가해도 이 파일을 고칠 필요가 없다.
 */
export function renderGameSelector() {
  const grid = document.getElementById('game-module-grid');
  if (!grid) return;

  const count = store.gameState.players.length;
  const selected = store.gameState.selectedGame;
  const isHost = store.isHost;

  grid.innerHTML = listGames()
    .map((def) => {
      const valid = isPlayerCountValid(def, count);
      const isSelected = def.id === selected;
      const stateClass = isSelected
        ? 'border-indigo-500 bg-indigo-500/10'
        : valid
          ? `border-slate-700 bg-slate-800/50 ${isHost ? 'hover:bg-slate-700' : ''}`
          : 'border-slate-700 bg-slate-800/50 opacity-40';
      const cursor = isHost && valid ? 'cursor-pointer' : 'cursor-default';
      return `
        <button type="button" class="game-module-card text-left border ${stateClass} ${cursor} p-4 rounded-xl transition-all"
                data-game="${escapeHtml(def.id)}" ${isHost ? '' : 'tabindex="-1"'} aria-pressed="${isSelected}">
          <i class="ph ${escapeHtml(def.icon)} text-2xl ${isSelected ? 'text-indigo-400' : 'text-slate-400'} mb-2"></i>
          <h4 class="font-bold">${escapeHtml(def.name)}</h4>
          <p class="text-xs text-slate-400 mt-1">${escapeHtml(def.description)}</p>
          <p class="text-[11px] mt-1 ${valid ? 'text-slate-500' : 'text-amber-400'}">${playerRangeLabel(def)}</p>
        </button>
      `;
    })
    .join('');

  grid.querySelectorAll<HTMLButtonElement>('.game-module-card').forEach((card) => {
    card.addEventListener('click', () => onSelectGame(card.dataset.game!));
  });

  renderOptions();
  renderWarningAndStart();
}

function onSelectGame(id: string) {
  if (!store.isHost) {
    showToast('게임 선택은 방장만 할 수 있습니다.', 'info');
    return;
  }
  const def = getGame(id);
  if (!def) return;
  if (!isPlayerCountValid(def, store.gameState.players.length)) {
    showToast(`${def.name}은(는) ${playerRangeLabel(def)} 게임입니다.`, 'error');
    return;
  }
  store.updateGameState({ selectedGame: id, gameOptions: resolveOptions(def, {}) });
  syncStateToAll();
}

function renderOptions() {
  const box = document.getElementById('game-options');
  if (!box) return;
  const def = getGame(store.gameState.selectedGame);
  if (!def?.options?.length) {
    box.innerHTML = '';
    return;
  }
  const values = resolveOptions(def, store.gameState.gameOptions);

  box.innerHTML = def.options
    .map((opt) => {
      const current = opt.choices.find((c) => c.value === values[opt.key]);
      if (!store.isHost) {
        return `<div class="text-sm"><span class="text-slate-400">${escapeHtml(opt.label)}:</span> <span class="font-medium">${escapeHtml(current?.label ?? '')}</span></div>`;
      }
      return `
        <label class="flex flex-col gap-1 text-sm min-w-[12rem]">
          <span class="text-xs text-slate-400">${escapeHtml(opt.label)}</span>
          <select data-option="${escapeHtml(opt.key)}" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500">
            ${opt.choices
              .map((c) => `<option value="${escapeHtml(c.value)}" ${c.value === values[opt.key] ? 'selected' : ''}>${escapeHtml(c.label)}</option>`)
              .join('')}
          </select>
          ${current?.description ? `<span class="text-[11px] text-slate-500">${escapeHtml(current.description)}</span>` : ''}
        </label>
      `;
    })
    .join('');

  box.querySelectorAll<HTMLSelectElement>('select[data-option]').forEach((sel) => {
    sel.addEventListener('change', () => {
      store.updateGameState({ gameOptions: { ...values, [sel.dataset.option!]: sel.value } });
      syncStateToAll();
    });
  });
}

function renderWarningAndStart() {
  const def = getGame(store.gameState.selectedGame);
  const count = store.gameState.players.length;
  const valid = !!def && isPlayerCountValid(def, count);

  const warning = document.getElementById('module-warning');
  if (warning) {
    const show = !!def && !valid;
    warning.classList.toggle('hidden', !show);
    warning.innerHTML = show
      ? `<i class="ph ph-warning"></i> ${escapeHtml(def!.name)}: ${playerRangeLabel(def!)} 필요 (현재 ${count}명)`
      : '';
  }

  const btn = document.getElementById('btn-start-game') as HTMLButtonElement | null;
  if (btn) {
    const enabled = store.isHost && valid;
    btn.disabled = !enabled;
    btn.classList.toggle('opacity-50', !enabled);
    btn.classList.toggle('cursor-not-allowed', !enabled);
    btn.classList.toggle('hidden', !store.isHost);
  }
}
