import { registerGameModule } from '../registry';

export function initCadia() {
  registerGameModule({
    id: 'cadia',
    name: '카르디아 (Duel for Cardia)',
    minPlayers: 2,
    maxPlayers: 2,
    description: '2인 전략 카드 듀얼 게임',
    icon: 'ph-swords',
  });
}
