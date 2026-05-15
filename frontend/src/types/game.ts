export interface Player {
  id: string;
  name: string;
  balance: number;
  currentBet: number;
  isFolded: boolean;
  isHost: boolean;
  isPaused: boolean;
  socketId: string;
}

export type GameStatus = 'lobby' | 'in_round' | 'ended';

export interface RoundHistory {
  round: number;
  winnerIds: string[];
  pot: number;
  timestamp: string;
}

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

export interface UserInfo {
  id: string;
  name: string;
}
