import { registerGameModule } from '../registry';

export function initCosmo() {
  registerGameModule({
    id: 'cosmo',
    name: '코스모 (Cosmo)',
    minPlayers: 2,
    maxPlayers: 5,
    description: '포커 핸드 빌딩 카드 게임 (2~5인)',
    icon: 'ph-rocket',
  });
}
