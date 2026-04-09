import express from 'express';
import { requireAuth, getAuth } from '@clerk/express';
import User from '../models/User.js';

const router = express.Router();

router.get('/api/me', requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const user = await User.findOne({ clerkId: userId });
  res.json(user);
});

export default router;
