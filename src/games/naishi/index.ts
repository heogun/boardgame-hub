import { registerGameModule } from '../registry';

export function initNaishi() {
  registerGameModule({
    id: 'naishi',
    name: '나이시 (Naishi)',
    minPlayers: 2,
    maxPlayers: 2,
    description: '2인 전략 카드 게임',
    icon: 'ph-swords',
  });
}
