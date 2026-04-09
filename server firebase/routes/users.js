import express from 'express';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/me — get current user's MongoDB document
router.get('/api/me', verifyFirebaseToken, async (req, res) => {
  const user = await User.findOne({ firebaseUid: req.user.uid });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

export default router;