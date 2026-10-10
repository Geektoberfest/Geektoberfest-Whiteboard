import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { isAllowedOrigin } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import { ApiError } from './utils/ApiError.js';

function allowOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new ApiError(403, 'This origin is not allowed to call the API.', 'ORIGIN_NOT_ALLOWED'));
}

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: allowOrigin }));
  app.use(express.json({ limit: '256kb' }));

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
