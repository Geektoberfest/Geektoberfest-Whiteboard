import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}.`));
}

// Express only recognises an error handler by its four parameters, so `next` is
// unused here even though it has to stay in the signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || (error.type === 'entity.parse.failed' ? 400 : error.name === 'ValidationError' ? 422 : error.code === 11000 ? 409 : 500);

  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Something went wrong on our side.' : error.message,
    error: error.code === 11000 ? 'DUPLICATE_RESOURCE' : error.code || (statusCode === 400 ? 'INVALID_REQUEST' : statusCode === 422 ? 'VALIDATION_ERROR' : statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
    ...(error.errors ? { details: Object.values(error.errors).map(({ path, message }) => ({ field: path, message })) } : {}),
    ...(env.nodeEnv === 'development' && statusCode >= 500 ? { detail: error.message } : {}),
  });
}
