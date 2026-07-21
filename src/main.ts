import './app.css';
import { initGameRegistry } from './games/registry';
import { initLobbyEvents } from './ui/lobby';
import { initRoomEvents } from './ui/room';

initGameRegistry();
initLobbyEvents();
initRoomEvents();
