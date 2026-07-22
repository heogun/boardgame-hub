import './app.css';
import { initGameRegistry } from './games/registry';
import { initLobbyEvents } from './ui/lobby';
import { initRoomEvents } from './ui/room';
import { store } from './state/store';
import { updateScreen } from './ui/utils/dom';
import { initLevel10Screen } from './games/level10/ui';
import { initBuffaloScreen } from './games/buffalo/ui';
import { initDraculaScreen } from './games/dracula/ui';
import { initNaishiScreen } from './games/naishi/ui';
import { initCadiaScreen } from './games/cadia/ui';

initGameRegistry();
initLobbyEvents();
initRoomEvents();

store.subscribe(() => {
  const screen = store.currentScreen;
  if (screen === 'game-level10') {
    updateScreen('game-level10');
    initLevel10Screen();
  } else if (screen === 'game-buffalo') {
    updateScreen('game-buffalo');
    initBuffaloScreen();
  } else if (screen === 'game-dracula') {
    updateScreen('game-dracula');
    initDraculaScreen();
  } else if (screen === 'game-naishi') {
    updateScreen('game-naishi');
    initNaishiScreen();
  } else if (screen === 'game-cadia') {
    updateScreen('game-cadia');
    initCadiaScreen();
  }
});
