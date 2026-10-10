import { User } from '../models/User.js';
import { verifyToken } from '../services/tokenService.js';
import { registerBoardHandlers } from './boardHandlers.js';

async function resolveSocketUser(token) {
  const userId = verifyToken(token);
  const user = await User.findById(userId).select('name color');
  if (!user) throw new Error('Account not found');

  return { id: user._id.toString(), name: user.name, color: user.color };
}

export function registerSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing token');

      socket.data.user = await resolveSocketUser(token);
      next();
    } catch {
      next(new Error('Not authorized'));
    }
  });

  registerBoardHandlers(io);
}
