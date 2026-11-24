import { store } from '../../state/store';
import { escapeHtml } from './escape';

/** isSystem=true 이면 message 를 HTML 로 넣는다 (호출자가 사용자 입력을 escapeHtml 해야 함). 채팅은 자동 이스케이프. */
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
    logEntry.innerHTML = `<span class="text-slate-500">[${time}]</span> <span class="${color} font-bold">${escapeHtml(senderName)}:</span> <span class="text-slate-300">${escapeHtml(message)}</span>`;
  }

  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;
}
