import { User } from '../models/User.js';
import { verifyToken } from '../services/tokenService.js';
import { ApiError } from '../utils/ApiError.js';

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) throw ApiError.unauthorized('Sign in to continue.');

    const userId = verifyToken(token);
    const user = await User.findById(userId);
    if (!user) throw ApiError.unauthorized('This account no longer exists.');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
