export interface RoundHistory {
  round: number;
  winnerIds: string[];
  pot: number;
  timestamp: Date;
}

export interface Player {
  id: string; // Now a persistent UUID from client
  socketId: string; // Current socket connection id
  name: string;
  balance: number;
  currentBet: number;
  isFolded: boolean;
  isHost: boolean;
  isPaused: boolean;
}

export type GameStatus = 'lobby' | 'in_round' | 'ended';

export interface GameState {
  sessionId: string;
  players: Player[];
  pot: number;
  currentRound: number;
  status: GameStatus;
  startingBalance: number;
  minBet: number;
  activePlayerIndex: number;
  history: RoundHistory[];
}
