import { Router } from 'express';
import { body, param } from 'express-validator';
import { createRoom, getRoom, joinRoom, listRooms } from '../controllers/roomController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isValidRoomCode } from '../utils/roomCode.js';

const roomIdRule = param('roomId')
  .custom(isValidRoomCode)
  .withMessage('Room codes are made of six letters and numbers.');

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Room name must be 2 to 60 characters.'),
  body('visibility')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Visibility must be either public or private.'),
  validate,
  asyncHandler(createRoom),
);

router.get('/', asyncHandler(listRooms));

router.get('/:roomId', roomIdRule, validate, asyncHandler(getRoom));

router.post('/:roomId/join', roomIdRule, validate, asyncHandler(joinRoom));

export default router;
