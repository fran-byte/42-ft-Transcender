import ROOM_CONFIGS from '../game/roomConfigs.js';

export function emitLobbyState(io, games) {
  const lobbyRooms = Object.values(ROOM_CONFIGS).map((roomConfig) => {
    const game = games[roomConfig.id];

    if (!game) {
      return {
        roomId: roomConfig.id,
        roomName: roomConfig.roomName,
        playersCount: 0,
        spectatorsCount: 0,
        totalConnected: 0,
        maxPlayers: roomConfig.maxPlayers,
        gameState: 'waiting',
        minBet: roomConfig.minBet,
        maxBet: roomConfig.maxBet,
        mode: roomConfig.mode,
      };
    }

    const connectedPlayers = game.playerOrder
      .map((id) => game.players[id])
      .filter((p) => p && p.socketIds instanceof Set && p.socketIds.size > 0);

    const connectedSpectators = game.spectators.filter(
      (s) => s && s.socketIds instanceof Set && s.socketIds.size > 0
    );

    return {
      roomId: game.id,
      roomName: game.roomName,
      playersCount: connectedPlayers.length,
      spectatorsCount: connectedSpectators.length,
      totalConnected: connectedPlayers.length + connectedSpectators.length,
      maxPlayers: game.maxPlayers,
      gameState: game.gameState,
      minBet: game.minBet,
      maxBet: game.maxBet,
      mode: game.mode,
    };
  });

  io.emit('lobby_state', lobbyRooms);
}

export function registerLobbyHandlers(io, socket, games) {
  emitLobbyState(io, games);

  socket.on('get_lobby_state', () => {
    emitLobbyState(io, games);
  });
}
