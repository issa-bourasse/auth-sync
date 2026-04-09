import express from 'express';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';
import User from '../models/User.js';

const router = express.Router();

// POST /api/auth/sync — called after every sign-in/sign-up
router.post('/api/auth/sync', verifyFirebaseToken, async (req, res) => {
  const { uid, email, name, picture } = req.user;
  const { firstName, lastName } = req.body || {};

  // Split displayName if individual names not provided
  let fName = firstName;
  let lName = lastName;
  if (!fName && name) {
    const parts = name.split(' ');
    fName = parts[0];
    lName = parts.slice(1).join(' ');
  }

  const user = await User.findOneAndUpdate(
    { firebaseUid: uid },
    {
      email,
      firstName: fName,
      lastName:  lName,
      photoURL:  picture || null,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json(user);
});

export default router;
