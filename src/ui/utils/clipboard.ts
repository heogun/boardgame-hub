import { showToast } from './toast';

export function copyToClipboard(text: string, label: string = '코드') {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(`${label} [${text}] 복사 완료!`, 'success');
  } catch {
    showToast('클립보드 복사에 실패했습니다.', 'error');
  }
}
