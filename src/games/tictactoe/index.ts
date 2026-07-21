import { registerGameModule } from '../registry';

export function initTicTacToe() {
  registerGameModule({
    id: 'tictactoe',
    name: '틱택토',
    minPlayers: 1,
    maxPlayers: 4,
    description: '1~4인용 (룰 테스트용)',
    icon: 'ph-hash',
  });
}
