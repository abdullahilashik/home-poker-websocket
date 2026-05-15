import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketToGame: Map<string, string> = new Map();

  constructor(private readonly gameService: GameService) {}

  @SubscribeMessage('create_game')
  handleCreateGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string; playerId: string; startingBalance?: number; minBet?: number },
  ) {
    const state = this.gameService.createGame(data.startingBalance, data.minBet);
    try {
      const { player, state: newState } = this.gameService.joinGame(state.sessionId, data.name, data.playerId, client.id);
      client.join(newState.sessionId);
      this.socketToGame.set(client.id, newState.sessionId);
      this.socketToGame.set(player.id, newState.sessionId); 
      client.emit('player_joined', player);
      return newState;
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('join_game')
  handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; name: string; playerId: string },
  ) {
    try {
      const { player, state } = this.gameService.joinGame(data.sessionId, data.name, data.playerId, client.id);
      client.join(state.sessionId);
      this.socketToGame.set(client.id, state.sessionId);
      this.socketToGame.set(player.id, state.sessionId);
      client.emit('player_joined', player);
      this.server.to(state.sessionId).emit('game_state', state);
      return { success: true, player, state };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('start_round')
  handleStartRound(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    try {
      const state = this.gameService.getGame(data.sessionId);
      if (!state) throw new Error('Game not found');
      
      const player = state.players.find(p => p.socketId === client.id);
      if (!player?.isHost) throw new Error('Only the host can start the round');

      const newState = this.gameService.startRound(data.sessionId);
      this.server.to(data.sessionId).emit('round_started', newState);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('advance_street')
  handleAdvanceStreet(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    try {
      const state = this.gameService.getGame(data.sessionId);
      if (!state) throw new Error('Game not found');

      const player = state.players.find(p => p.socketId === client.id);
      if (!player?.isHost) throw new Error('Only the host can advance streets');

      const newState = this.gameService.advanceStreet(data.sessionId);
      this.server.to(data.sessionId).emit('street_advanced', newState);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('end_round')
  handleEndRound(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    try {
      const state = this.gameService.getGame(data.sessionId);
      if (!state) throw new Error('Game not found');

      const player = state.players.find(p => p.socketId === client.id);
      if (!player?.isHost) throw new Error('Only the host can end the round');

      const newState = this.gameService.endRound(data.sessionId);
      this.server.to(data.sessionId).emit('round_ended', newState);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('select_winners')
  handleSelectWinners(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; winnerIds: string[] },
  ) {
    try {
      const state = this.gameService.getGame(data.sessionId);
      if (!state) throw new Error('Game not found');

      const player = state.players.find(p => p.socketId === client.id);
      if (!player?.isHost) throw new Error('Only the host can select winners');

      const newState = this.gameService.selectWinners(data.sessionId, data.winnerIds);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('place_bet')
  handlePlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; playerId: string; amount: number },
  ) {
    try {
      const newState = this.gameService.placeBet(data.sessionId, data.playerId, data.amount);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('check')
  handleCheck(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; playerId: string },
  ) {
    try {
      const newState = this.gameService.check(data.sessionId, data.playerId);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('call')
  handleCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; playerId: string },
  ) {
    try {
      const newState = this.gameService.call(data.sessionId, data.playerId);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('raise')
  handleRaise(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; playerId: string; raiseAmount: number },
  ) {
    try {
      const newState = this.gameService.raise(data.sessionId, data.playerId, data.raiseAmount);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('fold')
  handleFold(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; playerId: string },
  ) {
    try {
      const newState = this.gameService.fold(data.sessionId, data.playerId);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('remove_player')
  handleRemovePlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; playerId: string },
  ) {
    try {
      const state = this.gameService.getGame(data.sessionId);
      if (!state) throw new Error('Game not found');

      const player = state.players.find(p => p.socketId === client.id);
      if (!player?.isHost) throw new Error('Only the host can remove players');

      const newState = this.gameService.removePlayer(data.sessionId, data.playerId);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('toggle_pause')
  handleTogglePause(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; playerId: string },
  ) {
    try {
      const state = this.gameService.getGame(data.sessionId);
      if (!state) throw new Error('Game not found');

      const player = state.players.find(p => p.socketId === client.id);
      if (!player?.isHost) throw new Error('Only the host can pause players');

      const newState = this.gameService.togglePause(data.sessionId, data.playerId);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('update_settings')
  handleUpdateSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; settings: any },
  ) {
    try {
      const state = this.gameService.getGame(data.sessionId);
      if (!state) throw new Error('Game not found');

      const player = state.players.find(p => p.socketId === client.id);
      if (!player?.isHost) throw new Error('Only the host can update settings');

      const newState = this.gameService.updateSettings(data.sessionId, data.settings);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('rebuy')
  handleRebuy(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; amount: number },
  ) {
    try {
      const state = this.gameService.getGame(data.sessionId);
      if (!state) throw new Error('Game not found');
      const player = state.players.find(p => p.socketId === client.id);
      if (!player) throw new Error('Player not found');
      
      const newState = this.gameService.rebuy(data.sessionId, player.id, data.amount);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('end_game')
  handleEndGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const state = this.gameService.getGame(data.sessionId);
      if (!state) throw new Error('Game not found');
      const player = state.players.find(p => p.socketId === client.id);
      if (!player?.isHost) throw new Error('Only the host can end the game');

      const newState = this.gameService.endGame(data.sessionId);
      this.server.to(data.sessionId).emit('game_state', newState);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  handleDisconnect(client: Socket) {
    const sessionId = this.socketToGame.get(client.id);
    if (sessionId) {
      const state = this.gameService.getGame(sessionId);
      if (state) {
        const player = state.players.find(p => p.socketId === client.id);
        if (player) {
          player.socketId = '';
        }
        this.server.to(sessionId).emit('game_state', state);
      }
      this.socketToGame.delete(client.id);
    }
  }
}
