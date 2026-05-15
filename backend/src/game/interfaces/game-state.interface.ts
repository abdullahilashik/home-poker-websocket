export interface RoundHistory {
  round: number;
  winnerIds: string[];
  pot: number;
  timestamp: Date;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  balance: number;
  currentBet: number;
  totalRoundBet: number;
  isFolded: boolean;
  isHost: boolean;
  isPaused: boolean;
  hasActed: boolean;
  isAllIn: boolean;
}

export type GameStatus = 'lobby' | 'pre_flop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended';

export interface GameState {
  sessionId: string;
  players: Player[];
  pot: number;
  currentRound: number;
  status: GameStatus;
  startingBalance: number;
  minBet: number;
  smallBlind: number;
  bigBlind: number;
  activePlayerIndex: number;
  history: RoundHistory[];
}
