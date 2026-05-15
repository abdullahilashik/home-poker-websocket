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
      smallBlind: Math.floor(minBet / 2),
      bigBlind: minBet,
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
        totalRoundBet: 0,
        isFolded: false,
        isHost,
        isPaused: false,
        hasActed: false,
        isAllIn: false,
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
    if (game.players.length < 2) throw new Error('Need at least 2 players');

    game.status = 'pre_flop';
    game.currentRound++;
    game.pot = 0;
    game.players.forEach(p => {
      p.currentBet = 0;
      p.totalRoundBet = 0;
      p.isFolded = false;
      p.hasActed = false;
      p.isAllIn = false;
    });

    // Post blinds
    const activePlayers = game.players.filter(p => !p.isPaused);
    const sbIndex = game.activePlayerIndex % game.players.length;
    const bbIndex = (sbIndex + 1) % game.players.length;

    const sbPlayer = game.players[sbIndex];
    const bbPlayer = game.players[bbIndex];

    const sbAmount = Math.min(game.smallBlind, sbPlayer.balance);
    const bbAmount = Math.min(game.bigBlind, bbPlayer.balance);

    sbPlayer.balance -= sbAmount;
    sbPlayer.currentBet += sbAmount;
    sbPlayer.totalRoundBet += sbAmount;
    if (sbPlayer.balance === 0) sbPlayer.isAllIn = true;
    
    bbPlayer.balance -= bbAmount;
    bbPlayer.currentBet += bbAmount;
    bbPlayer.totalRoundBet += bbAmount;
    if (bbPlayer.balance === 0) bbPlayer.isAllIn = true;

    game.pot = sbAmount + bbAmount;

    // Action starts after BB
    game.activePlayerIndex = (bbIndex + 1) % game.players.length;
    // Skip paused players
    this.advanceToNextActivePlayer(game);

    return game;
  }

  advanceStreet(sessionId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const streetOrder: GameStatus[] = ['pre_flop', 'flop', 'turn', 'river'];
    const currentIdx = streetOrder.indexOf(game.status as any);
    if (currentIdx === -1 || currentIdx >= streetOrder.length - 1) {
      throw new Error('No more streets to advance');
    }

    game.status = streetOrder[currentIdx + 1];

    // Reset current bets and action tracking for new street
    game.players.forEach(p => {
      p.currentBet = 0;
      p.hasActed = false;
    });

    // Action starts after the dealer (BB position)
    const lastPos = game.players.length - 1;
    const sbPos = this.findSBPosition(game);
    const bbPos = (sbPos + 1) % game.players.length;
    game.activePlayerIndex = (bbPos + 1) % game.players.length;
    this.advanceToNextActivePlayer(game);

    return game;
  }

  placeBet(sessionId: string, playerId: string, amount: number): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.isPaused) throw new Error('You are currently paused by the host');
    this.validateTurn(game, playerId);
    if (this.isStreetDone(game)) throw new Error('Betting complete for this street');
    if (amount < game.minBet) throw new Error(`Minimum bet is $${game.minBet}`);
    if (player.balance < amount) throw new Error('Insufficient balance');

    player.balance -= amount;
    player.currentBet += amount;
    player.totalRoundBet += amount;
    game.pot += amount;
    player.hasActed = true;
    if (player.balance === 0) player.isAllIn = true;

    this.advanceTurn(game);
    return game;
  }

  check(sessionId: string, playerId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.isPaused) throw new Error('You are currently paused by the host');
    this.validateTurn(game, playerId);
    if (this.isStreetDone(game)) throw new Error('Betting complete for this street');

    const maxBet = Math.max(...game.players.map(p => p.currentBet));
    if (player.currentBet < maxBet) throw new Error('Cannot check, there is a bet to call');

    player.hasActed = true;
    this.advanceTurn(game);
    return game;
  }

  call(sessionId: string, playerId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.isPaused) throw new Error('You are currently paused by the host');
    this.validateTurn(game, playerId);
    if (this.isStreetDone(game)) throw new Error('Betting complete for this street');

    const maxBet = Math.max(...game.players.map(p => p.currentBet));
    const callAmount = Math.min(maxBet - player.currentBet, player.balance);

    if (callAmount <= 0) throw new Error('Nothing to call');

    player.balance -= callAmount;
    player.currentBet += callAmount;
    player.totalRoundBet += callAmount;
    game.pot += callAmount;
    player.hasActed = true;
    if (player.balance === 0) player.isAllIn = true;

    this.advanceTurn(game);
    return game;
  }

  raise(sessionId: string, playerId: string, raiseAmount: number): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.isPaused) throw new Error('You are currently paused by the host');
    this.validateTurn(game, playerId);
    if (this.isStreetDone(game)) throw new Error('Betting complete for this street');

    const maxBet = Math.max(...game.players.map(p => p.currentBet));
    const callPortion = maxBet - player.currentBet;
    const totalNeeded = callPortion + raiseAmount;

    if (player.balance < totalNeeded) throw new Error('Insufficient balance to raise');
    if (raiseAmount < game.minBet) throw new Error(`Minimum raise is $${game.minBet}`);

    player.balance -= totalNeeded;
    player.currentBet += totalNeeded;
    player.totalRoundBet += totalNeeded;
    game.pot += totalNeeded;
    player.hasActed = true;
    if (player.balance === 0) player.isAllIn = true;

    // Reset hasActed for other players since there's a new raise
    game.players.forEach(p => {
      if (p.id !== playerId && !p.isFolded && !p.isAllIn) {
        p.hasActed = false;
      }
    });

    this.advanceTurn(game);
    return game;
  }

  fold(sessionId: string, playerId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.isPaused) throw new Error('You are currently paused by the host');
    this.validateTurn(game, playerId);
    if (this.isStreetDone(game)) throw new Error('Betting complete for this street');

    player.isFolded = true;
    this.advanceTurn(game);
    return game;
  }

  endRound(sessionId: string): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    game.status = 'showdown';
    return game;
  }

  selectWinners(sessionId: string, winnerIds: string[]): GameState {
    const game = this.getGame(sessionId);
    if (!game) throw new Error('Game not found');

    const sortedByBet = [...game.players].sort((a, b) => a.totalRoundBet - b.totalRoundBet);
    const winners = game.players.filter(p => winnerIds.includes(p.id));

    let previousLevel = 0;

    for (const player of sortedByBet) {
      if (player.totalRoundBet === previousLevel) continue;
      if (player.totalRoundBet <= 0) continue;

      const levelDiff = player.totalRoundBet - previousLevel;
      const contributors = game.players.filter(p => p.totalRoundBet >= player.totalRoundBet);
      const sidePot = levelDiff * contributors.length;

      const eligibleWinners = winners.filter(w => w.totalRoundBet >= player.totalRoundBet);
      if (eligibleWinners.length > 0) {
        const share = sidePot / eligibleWinners.length;
        eligibleWinners.forEach(w => w.balance += share);
      }

      previousLevel = player.totalRoundBet;
    }

    game.history.push({
      round: game.currentRound,
      winnerIds,
      pot: game.pot,
      timestamp: new Date(),
    });

    game.pot = 0;
    game.status = 'lobby';
    game.players.forEach(p => {
      p.currentBet = 0;
      p.totalRoundBet = 0;
      p.hasActed = false;
      p.isAllIn = false;
    });

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
    if (player.isAllIn) player.isAllIn = false;
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
    // Keep blinds in sync with minBet if minBet changed
    if (settings.minBet !== undefined) {
      game.smallBlind = Math.floor(settings.minBet / 2);
      game.bigBlind = settings.minBet;
    }
    return game;
  }

  // --- Private helpers ---

  private validateTurn(game: GameState, playerId: string): void {
    const activePlayer = game.players[game.activePlayerIndex];
    if (activePlayer && activePlayer.id !== playerId) {
      throw new Error('Not your turn');
    }
  }

  private isStreetDone(game: GameState): boolean {
    const activePlayers = game.players.filter(p => !p.isFolded && !p.isPaused);
    if (activePlayers.length <= 1) return true;

    const maxBet = Math.max(...game.players.map(p => p.currentBet));
    const allHaveActed = activePlayers.every(p => p.hasActed || p.isAllIn);
    const allBetsEqual = activePlayers.every(p => p.currentBet === maxBet || p.isAllIn);

    return allHaveActed && allBetsEqual;
  }

  private advanceTurn(game: GameState): void {
    game.activePlayerIndex = (game.activePlayerIndex + 1) % game.players.length;
    this.advanceToNextActivePlayer(game);
  }

  private advanceToNextActivePlayer(game: GameState): void {
    const maxIterations = game.players.length;
    for (let i = 0; i < maxIterations; i++) {
      const player = game.players[game.activePlayerIndex];
      if (!player.isFolded && !player.isPaused && !player.isAllIn) return;
      game.activePlayerIndex = (game.activePlayerIndex + 1) % game.players.length;
    }
  }

  private findSBPosition(game: GameState): number {
    return game.activePlayerIndex > 0 ? game.activePlayerIndex - 1 : game.players.length - 1;
  }
}
