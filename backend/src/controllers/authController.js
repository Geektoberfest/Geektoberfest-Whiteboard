import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../services/tokenService.js';
import { ApiError } from '../utils/ApiError.js';

const SALT_ROUNDS = 10;

export async function register(req, res) {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) throw ApiError.conflict('An account with that email already exists.');

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
  });

  res.status(201).json({ token: signToken(user), user: user.toPublicJSON() });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  // One generic message for both branches so the endpoint cannot be used to
  // discover which emails are registered.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw ApiError.unauthorized('Email or password is incorrect.');
  }

  res.json({ token: signToken(user), user: user.toPublicJSON() });
}

export function me(req, res) {
  res.json({ user: req.user.toPublicJSON() });
}
