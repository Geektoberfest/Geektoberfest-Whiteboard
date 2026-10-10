import { validationResult } from 'express-validator';

export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((error) => ({ field: error.path, message: error.msg }));
  return res.status(400).json({ success: false, message: errors[0].message, error: 'VALIDATION_ERROR', errors });
}
