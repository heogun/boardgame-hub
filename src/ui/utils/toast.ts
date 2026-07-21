type ToastType = 'info' | 'error' | 'success';

export function showToast(message: string, type: ToastType = 'info') {
  const container = document.getElementById('toast-container')!;
  const toast = document.createElement('div');
  const colorClass =
    type === 'error'
      ? 'bg-red-500/90'
      : type === 'success'
        ? 'bg-emerald-500/90'
        : 'bg-slate-800/90';

  toast.className = `${colorClass} text-white px-4 py-3 rounded-lg shadow-lg text-sm backdrop-blur-sm border border-white/10 flex items-center gap-2 transform transition-all duration-300 translate-y-10 opacity-0`;

  const icon = type === 'error' ? 'ph-warning-circle' : type === 'success' ? 'ph-check-circle' : 'ph-info';
  toast.innerHTML = `<i class="ph ${icon} text-lg"></i><span>${message}</span>`;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
