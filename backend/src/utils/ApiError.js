/** Error carrying an HTTP status code so controllers do not repeat res.status calls. */
export class ApiError extends Error {
  constructor(statusCode, message, code = 'REQUEST_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }

  static badRequest(message) {
    return new ApiError(400, message, 'INVALID_REQUEST');
  }

  static unauthorized(message) {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message) {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message) {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message) {
    return new ApiError(409, message, 'CONFLICT');
  }
}
