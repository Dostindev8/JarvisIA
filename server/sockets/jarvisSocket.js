const jwt = require('jsonwebtoken');
const User = require('../models/User');

const userSockets = new Map();

function initJarvisSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token requerido'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Usuario inválido'));

      socket.userId = user._id.toString();
      next();
    } catch {
      next(new Error('Autenticación fallida'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    console.log(`[Socket] Usuario conectado: ${userId}`);

    socket.on('disconnect', () => {
      userSockets.get(userId)?.delete(socket.id);
      if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
    });
  });

  function broadcastToUser(userId, event, data) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    for (const sid of sockets) {
      io.to(sid).emit(event, data);
    }
  }

  function broadcastAll(event, data) {
    io.emit(event, data);
  }

  return { broadcastToUser, broadcastAll };
}

module.exports = initJarvisSocket;
