import './app.css';
import { initGameRegistry } from './games/registry';
import { initLobbyEvents } from './ui/lobby';
import { initRoomEvents } from './ui/room';
import { store } from './state/store';
import { updateScreen } from './ui/utils/dom';
import { initLevel10Screen } from './games/level10/ui';

initGameRegistry();
initLobbyEvents();
initRoomEvents();

store.subscribe(() => {
  const screen = store.currentScreen;
  if (screen === 'game-level10') {
    updateScreen('game-level10');
    initLevel10Screen();
  }
});
