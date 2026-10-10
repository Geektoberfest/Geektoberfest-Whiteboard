import 'dotenv/config';

export const parseClientOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try { return new URL(origin).origin; } catch { return ''; }
    })
    .filter(Boolean);

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  allowedOrigins: parseClientOrigins(process.env.CLIENT_URL),
  nodeEnv: process.env.NODE_ENV || 'development',
};

/** Environment variables the server cannot boot without. */
export const requiredEnvKeys = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];

export function findMissingEnvKeys(source = process.env) {
  return requiredEnvKeys.filter((key) => !source[key]);
}

export function isAllowedOrigin(origin, options = {}) {
  if (!origin) return true;

  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  const normalizedOrigin = parsed.origin;
  const nodeEnv = options.nodeEnv || env.nodeEnv;
  const allowedOrigins = options.allowedOrigins || env.allowedOrigins;

  if (allowedOrigins.includes(normalizedOrigin)) return true;

  // Vite may move to another free port when its configured port is busy. In
  // development only, allow HTTP loopback origins regardless of that port.
  const isLoopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]';
  return nodeEnv !== 'production' && parsed.protocol === 'http:' && isLoopback;
}
