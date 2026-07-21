import type { GameState, Player, Level10GameState } from '../types';

type Listener = () => void;

export type AppScreen = 'lobby' | 'room' | 'game-level10';

class Store {
  private _peer: import('peerjs').Peer | null = null;
  private _myId: string | null = null;
  private _myName = '';
  private _isHost = false;
  private _roomId: string | null = null;
  private _connections: Record<string, import('peerjs').DataConnection> = {};
  private _hostConnection: import('peerjs').DataConnection | null = null;
  private _gameState: GameState = {
    status: 'LOBBY',
    selectedGame: 'tictactoe',
    players: [],
  };
  private _currentScreen: AppScreen = 'lobby';
  private _l10: Level10GameState | null = null;

  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  get peer() {
    return this._peer;
  }
  get myId() {
    return this._myId;
  }
  get myName() {
    return this._myName;
  }
  get isHost() {
    return this._isHost;
  }
  get roomId() {
    return this._roomId;
  }
  get connections() {
    return this._connections;
  }
  get hostConnection() {
    return this._hostConnection;
  }
  get gameState() {
    return this._gameState;
  }
  get currentScreen() {
    return this._currentScreen;
  }
  get l10() {
    return this._l10;
  }

  set peer(p: import('peerjs').Peer | null) {
    this._peer = p;
    this.notify();
  }
  set myId(id: string | null) {
    this._myId = id;
    this.notify();
  }
  set myName(name: string) {
    this._myName = name;
    this.notify();
  }
  set isHost(v: boolean) {
    this._isHost = v;
    this.notify();
  }
  set roomId(id: string | null) {
    this._roomId = id;
    this.notify();
  }
  set hostConnection(c: import('peerjs').DataConnection | null) {
    this._hostConnection = c;
    this.notify();
  }
  set currentScreen(s: AppScreen) {
    this._currentScreen = s;
    this.notify();
  }
  set l10(v: Level10GameState | null) {
    this._l10 = v;
    this.notify();
  }

  setConnections(conns: Record<string, import('peerjs').DataConnection>) {
    this._connections = conns;
    this.notify();
  }

  setGameState(state: GameState) {
    this._gameState = state;
    this.notify();
  }

  updateGameState(partial: Partial<GameState>) {
    this._gameState = { ...this._gameState, ...partial };
    this.notify();
  }

  addPlayer(player: Player) {
    this._gameState.players.push(player);
    this.notify();
  }

  removePlayer(id: string) {
    const idx = this._gameState.players.findIndex((p) => p.id === id);
    if (idx > -1) {
      this._gameState.players.splice(idx, 1);
      this.notify();
    }
  }

  reset() {
    this._peer?.destroy();
    this._peer = null;
    this._myId = null;
    this._myName = '';
    this._isHost = false;
    this._roomId = null;
    this._connections = {};
    this._hostConnection = null;
    this._gameState = {
      status: 'LOBBY',
      selectedGame: 'tictactoe',
      players: [],
    };
    this._currentScreen = 'lobby';
    this._l10 = null;
    this.notify();
  }
}

export const store = new Store();
