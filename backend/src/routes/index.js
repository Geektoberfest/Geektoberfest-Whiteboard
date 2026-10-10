import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './authRoutes.js';
import roomRoutes from './roomRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  const database = mongoose.connection.readyState === 1 ? 'connected' : 'unavailable';
  const healthy = database === 'connected';
  res.status(healthy ? 200 : 503).json({ success: healthy, status: healthy ? 'ok' : 'degraded', database, uptime: process.uptime() });
});

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);

export default router;
