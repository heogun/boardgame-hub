import { registerGameModule } from '../registry';

export function initDracula() {
  registerGameModule({
    id: 'dracula',
    name: '드라큘라 vs 반헬싱',
    minPlayers: 2,
    maxPlayers: 2,
    description: '카드 전략 게임 (2인 전용)',
    icon: 'ph-skull',
  });
}
