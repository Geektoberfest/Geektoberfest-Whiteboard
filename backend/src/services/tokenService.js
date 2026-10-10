import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return payload.sub;
  } catch {
    throw ApiError.unauthorized('Your session is invalid or has expired.');
  }
}
