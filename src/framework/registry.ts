import type { AnyGameDefinition, GameOptions } from './types';

/**
 * src/games/<id>/index.ts 가 `export default defineGame({...})` 하면 자동으로 등록된다.
 * 새 게임을 추가할 때 공용 파일을 고칠 필요가 없다.
 */
const discovered = import.meta.glob<{ default: AnyGameDefinition }>('../games/*/index.ts', { eager: true });

const games = new Map<string, AnyGameDefinition>();

for (const [path, mod] of Object.entries(discovered)) {
  const def = mod.default;
  if (!def || typeof def.setup !== 'function') {
    console.error(`[registry] ${path} 에 default export 된 게임 정의가 없습니다.`);
    continue;
  }
  if (games.has(def.id)) {
    console.error(`[registry] 게임 id 중복: ${def.id} (${path})`);
    continue;
  }
  games.set(def.id, def);
}

export function getGame(id: string): AnyGameDefinition | undefined {
  return games.get(id);
}

export function listGames(): AnyGameDefinition[] {
  return [...games.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function isPlayerCountValid(def: AnyGameDefinition, count: number): boolean {
  return count >= def.minPlayers && count <= def.maxPlayers;
}

/** 옵션 값 검증: 정의에 없는 키/값은 기본값으로 바꾼다. */
export function resolveOptions(def: AnyGameDefinition, raw: GameOptions | undefined): GameOptions {
  const out: GameOptions = {};
  for (const opt of def.options ?? []) {
    const v = raw?.[opt.key];
    out[opt.key] = v !== undefined && opt.choices.some((c) => c.value === v) ? v : opt.default;
  }
  return out;
}

export function playerRangeLabel(def: AnyGameDefinition): string {
  return def.minPlayers === def.maxPlayers ? `${def.minPlayers}인` : `${def.minPlayers}~${def.maxPlayers}인`;
}
