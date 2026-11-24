const MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** 사용자 입력(닉네임, 채팅 등)을 innerHTML 에 넣기 전에 반드시 거친다. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => MAP[c]);
}
