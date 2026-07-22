import { registerGameModule } from '../registry';

export function initBuffalo() {
  registerGameModule({
    id: 'buffalo',
    name: '버팔로 체스',
    minPlayers: 2,
    maxPlayers: 2,
    description: '비대칭 전략 게임 (2인 전용)',
    icon: 'ph-horse',
  });
}
