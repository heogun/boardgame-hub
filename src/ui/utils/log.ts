import { store } from '../../state/store';

export function logSystem(
  message: string,
  isSystem: boolean = true,
  senderName: string = 'System',
) {
  const logContainer = document.getElementById('system-logs')!;
  const logEntry = document.createElement('div');
  const time = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });

  if (isSystem) {
    logEntry.className = 'text-slate-500';
    logEntry.innerHTML = `[${time}] ${message}`;
  } else {
    const color = senderName === store.myName ? 'text-indigo-300' : 'text-emerald-300';
    logEntry.innerHTML = `<span class="text-slate-500">[${time}]</span> <span class="${color} font-bold">${senderName}:</span> <span class="text-slate-300">${message}</span>`;
  }

  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;
}
