import { registerGameModule } from '../registry';

export function initLevel10() {
  registerGameModule({
    id: 'level10',
    name: '레벨 10 (The Mind)',
    minPlayers: 2,
    maxPlayers: 4,
    description: '협동 카드 게임 (2~4인 전용)',
    icon: 'ph-cards',
  });
}
