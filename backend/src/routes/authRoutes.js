import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { login, me, register } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Credential endpoints are the easiest thing to brute force, so they get a ceiling.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

const router = Router();

router.post(
  '/register',
  credentialLimiter,
  body('name').trim().isLength({ min: 2, max: 40 }).withMessage('Name must be 2 to 40 characters.'),
  body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  validate,
  asyncHandler(register),
);

router.post(
  '/login',
  credentialLimiter,
  body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  validate,
  asyncHandler(login),
);

router.get('/me', requireAuth, me);

export default router;
