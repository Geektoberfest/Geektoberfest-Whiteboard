/** Forwards rejected promises to the Express error handler. */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
