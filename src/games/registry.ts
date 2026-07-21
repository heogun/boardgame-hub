import type { GameModule } from '../types';

const modules = new Map<string, GameModule>();

export function registerGameModule(mod: GameModule) {
  modules.set(mod.id, mod);
}

export function getGameModule(id: string): GameModule | undefined {
  return modules.get(id);
}

export function getAllGameModules(): GameModule[] {
  return Array.from(modules.values());
}

export function initGameRegistry() {
  registerGameModule({
    id: 'tictactoe',
    name: '틱택토',
    minPlayers: 1,
    maxPlayers: 4,
    description: '1~4인용 (룰 테스트용)',
    icon: 'ph-hash',
  });

  registerGameModule({
    id: 'level10',
    name: '레벨 10 (The Mind)',
    minPlayers: 2,
    maxPlayers: 4,
    description: '협동 카드 게임 (2~4인 전용)',
    icon: 'ph-cards',
  });
}
