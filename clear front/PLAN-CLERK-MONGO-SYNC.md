# Plan: Sync Clerk Users with MongoDB (React + Vite)

## Current Stack
- **Frontend**: React 19 + Vite + Ant Design 6 + `@clerk/react`
- **Auth**: Clerk (already installed)
- **Database**: MongoDB (to be added)

---

## Architecture Overview

```
User signs up/in via Clerk
        │
        ├──► Frontend: Clerk React components (done ✅)
        │
        └──► Backend: Express API + Mongoose
                │
                ├── Option A: Clerk Webhooks (recommended, real-time)
                └── Option B: On-demand sync (simpler, less reliable)
```

---

## Step-by-Step Plan

### Phase 1 — Backend Setup

#### 1.1 Create Express Server
```
mkdir server && cd server
npm init -y
npm install express mongoose dotenv cors
```

#### 1.2 Connect to MongoDB
```js
// server/db.js
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGODB_URI);
```

#### 1.3 Create User Model
```js
// server/models/User.js
import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  clerkId:    { type: String, required: true, unique: true },
  email:      { type: String, required: true },
  firstName:  String,
  lastName:   String,
  imageUrl:   String,
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
});

export default model('User', userSchema);
```

---

### Phase 2 — Clerk Webhook Sync (Recommended)

#### 2.1 Install Svix (Clerk uses Svix for webhooks)
```
cd server
npm install svix
```

#### 2.2 Create Webhook Endpoint
```js
// server/routes/webhooks.js
import { Webhook } from 'svix';
import User from '../models/User.js';

export async function handleClerkWebhook(req, res) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  const wh = new Webhook(SIGNING_SECRET);
  let evt;

  try {
    evt = wh.verify(JSON.stringify(req.body), {
      'svix-id':        req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });
  } catch {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { type, data } = evt;

  switch (type) {
    case 'user.created':
      await User.create({
        clerkId:   data.id,
        email:     data.email_addresses[0]?.email_address,
        firstName: data.first_name,
        lastName:  data.last_name,
        imageUrl:  data.image_url,
      });
      break;

    case 'user.updated':
      await User.findOneAndUpdate(
        { clerkId: data.id },
        {
          email:     data.email_addresses[0]?.email_address,
          firstName: data.first_name,
          lastName:  data.last_name,
          imageUrl:  data.image_url,
          updatedAt: new Date(),
        }
      );
      break;

    case 'user.deleted':
      await User.findOneAndDelete({ clerkId: data.id });
      break;
  }

  res.json({ received: true });
}
```

#### 2.3 Register Webhook in Clerk Dashboard
1. Go to **Clerk Dashboard → Webhooks**
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy the **Signing Secret** → save as `CLERK_WEBHOOK_SECRET` in `.env`

#### 2.4 For Local Dev — Use ngrok
```
ngrok http 5000
```
Then paste the ngrok URL into Clerk Dashboard.

---

### Phase 3 — Backend API Routes (for frontend to query users)

#### 3.1 Protected API Route
```js
// server/routes/users.js
import { ClerkExpressRequireAuth } from '@clerk/express';
import User from '../models/User.js';

router.get('/api/me', ClerkExpressRequireAuth(), async (req, res) => {
  const user = await User.findOne({ clerkId: req.auth.userId });
  res.json(user);
});
```

#### 3.2 Install Clerk Express SDK
```
npm install @clerk/express
```

---

### Phase 4 — Frontend Integration

#### 4.1 Fetch MongoDB User in React
```jsx
import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';

function useMongoUser() {
  const { getToken } = useAuth();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const token = await getToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(await res.json());
    }
    fetchUser();
  }, [getToken]);

  return user;
}
```

#### 4.2 Vite Proxy (dev only)
```js
// vite.config.js — add proxy
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
```

---

### Phase 5 — Environment Variables

#### Frontend `.env`
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

#### Backend `server/.env`
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/antdesign
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
PORT=5000
```

---

## File Structure (Final)

```
ANT DESGIN/
├── src/                    # React frontend (existing)
│   ├── App.jsx
│   ├── pages/
│   └── ...
├── server/                 # NEW — Express backend
│   ├── index.js            # Entry point
│   ├── db.js               # Mongoose connection
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   ├── webhooks.js     # Clerk webhook handler
│   │   └── users.js        # Protected user routes
│   ├── .env
│   └── package.json
├── package.json
└── vite.config.js
```

---

## Checklist

- [ ] Create `server/` with Express + Mongoose
- [ ] Define `User` model with `clerkId` as unique key
- [ ] Set up Clerk webhook endpoint with Svix verification
- [ ] Register webhook URL in Clerk Dashboard
- [ ] Add protected `/api/me` route using `@clerk/express`
- [ ] Add Vite proxy for dev
- [ ] Create `useMongoUser` hook in frontend
- [ ] Test: sign up → check MongoDB for new user doc
- [ ] Test: update profile → check MongoDB updates
- [ ] Test: delete account → check MongoDB deletion

---

## Security Notes

- **Always verify webhook signatures** with Svix — never trust raw payloads
- **Never expose `CLERK_SECRET_KEY`** to the frontend
- **Use `ClerkExpressRequireAuth()`** on all backend routes that access user data
- **Validate/sanitize** all data before writing to MongoDB
