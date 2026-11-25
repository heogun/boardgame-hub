import './app.css';
import { initLobbyEvents } from './ui/lobby';
import { initRoomEvents } from './ui/room';
import { store } from './state/store';
import { updateScreen } from './ui/utils/dom';
import { rejoinOnLoad } from './networking/client';

initLobbyEvents();
initRoomEvents();

// 화면 전환은 store.currentScreen 하나로 결정한다. 게임 화면 그리기는 framework/session.ts 가 맡는다.
let shownScreen = store.currentScreen;
updateScreen(shownScreen);
store.subscribe(() => {
  if (store.currentScreen !== shownScreen) {
    shownScreen = store.currentScreen;
    updateScreen(shownScreen);
  }
});

// 새로고침했다면 이 탭에서 하던 방에 다시 들어간다
rejoinOnLoad();
