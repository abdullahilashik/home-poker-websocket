import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import type { GameState } from '../types/game';
import { v4 as uuidv4 } from 'uuid';

const SOCKET_URL = `http://${window.location.hostname}:3000`;

class SocketService {
  private socket: Socket | null = null;
  private playerId: string;

  constructor() {
    // Initialize persistent player ID
    const savedId = localStorage.getItem('poker_player_id');
    if (savedId) {
      this.playerId = savedId;
    } else {
      this.playerId = uuidv4();
      localStorage.setItem('poker_player_id', this.playerId);
    }
  }

  getPlayerId() {
    return this.playerId;
  }

  connect() {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_URL);

    this.socket.on('game_state', (state: GameState) => {
      useGameStore.getState().setGameState(state);
    });

    this.socket.on('player_joined', (player: any) => {
      useGameStore.getState().setUserInfo({ id: player.id, name: player.name });
    });

    this.socket.on('error', (err: any) => {
      console.error('Socket error:', err);
      alert(err);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any, callback?: (...args: any[]) => void) {
    if (!this.socket) {
      this.connect();
    }
    if (callback) {
      return this.socket?.emit(event, data, callback);
    }
    return this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on(event, callback);
  }
}

export const socketService = new SocketService();
