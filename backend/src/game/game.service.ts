import { Injectable } from '@nestjs/common';
import { GameState, Player, GameStatus } from './interfaces/game-state.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameService {
  private games: Map<string, GameState> = new Map();

  createGame(startingBalance: number = 1000, minBet: number = 10): GameState {
    const sessionId = uuidv4();
    const newState: GameState = {
      sessionId,
      players: [],
      pot: 0,
      currentRound: 0,
      status: 'lobby',
      startingBalance,
      minBet,
      activePlayerIndex: 0,
      history: [],
    };
    this.games.set(sessionId, newState);
    return newState;
  }

  getGame(sessionId: string): GameState | undefined {
    return this.games.get(sessionId);
  }

  joinGame(sessionId: string, name: string, playerId: string, socketId: string): { player: Player; state: GameState } {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    let player = game.players.find(p => p.id === playerId);
    
    if (!player) {
      const isHost = game.players.length === 0;
      player = {
        id: playerId,
        socketId,
        name,
        balance: game.startingBalance,
        currentBet: 0,
        isFolded: false,
        isHost,
        isPaused: false,
      };
      game.players.push(player);
    } else {
      player.socketId = socketId;
    }

    return { player, state: game };
  }

  startRound(sessionId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    game.status = 'in_round';
    game.currentRound++;
    game.pot = 0;
    game.players.forEach(p => {
      p.currentBet = 0;
      p.isFolded = false;
    });

    return game;
  }

  placeBet(sessionId: string, playerId: string, amount: number): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.isPaused) throw new Error('You are currently paused by the host');
    if (amount < game.minBet) throw new Error(`Minimum bet is $${game.minBet}`);

    if (player.balance < amount) throw new Error('Insufficient balance');

    player.balance -= amount;
    player.currentBet += amount;
    game.pot += amount;

    return game;
  }

  call(sessionId: string, playerId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.isPaused) throw new Error('You are currently paused by the host');

    const maxBet = Math.max(...game.players.map(p => p.currentBet));
    const callAmount = maxBet - player.currentBet;

    if (player.balance < callAmount) throw new Error('Insufficient balance to call');

    player.balance -= callAmount;
    player.currentBet += callAmount;
    game.pot += callAmount;

    return game;
  }

  raise(sessionId: string, playerId: string, raiseAmount: number): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.isPaused) throw new Error('You are currently paused by the host');

    const maxBet = Math.max(...game.players.map(p => p.currentBet));
    const totalNeeded = (maxBet - player.currentBet) + raiseAmount;

    if (player.balance < totalNeeded) throw new Error('Insufficient balance to raise');

    player.balance -= totalNeeded;
    player.currentBet += totalNeeded;
    game.pot += totalNeeded;

    return game;
  }

  fold(sessionId: string, playerId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.isPaused) throw new Error('You are currently paused by the host');

    player.isFolded = true;
    return game;
  }

  endRound(sessionId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    game.status = 'lobby'; // Back to lobby or waiting for winner selection
    return game;
  }

  selectWinners(sessionId: string, winnerIds: string[]): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const winAmount = game.pot / winnerIds.length;
    winnerIds.forEach(id => {
      const player = game.players.find(p => p.id === id);
      if (player) {
        player.balance += winAmount;
      }
    });

    game.history.push({
      round: game.currentRound,
      winnerIds,
      pot: game.pot,
      timestamp: new Date(),
    });

    game.pot = 0;
    game.status = 'lobby';
    game.players.forEach(p => p.currentBet = 0);

    return game;
  }

  removePlayer(sessionId: string, playerId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    game.players = game.players.filter(p => p.id !== playerId);
    if (game.players.length === 0) {
      this.games.delete(sessionId);
      throw new Error('Last player removed, session closed');
    }
    return game;
  }

  togglePause(sessionId: string, playerId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    player.isPaused = !player.isPaused;
    return game;
  }

  rebuy(sessionId: string, playerId: string, amount: number): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    player.balance += amount;
    return game;
  }

  endGame(sessionId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    game.status = 'ended';
    return game;
  }

  updateSettings(sessionId: string, settings: Partial<GameState>): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    Object.assign(game, settings);
    return game;
  }
}
