# Plan: Sync Firebase Auth Users with MongoDB (React + Vite)

## Current Stack
- **Frontend**: React 19 + Vite 8 + Ant Design 6
- **Auth**: Clerk (to be **replaced** with Firebase Auth)
- **Database**: MongoDB via Mongoose
- **Backend**: Express 5

---

## Architecture Overview

```
User signs up/in via Firebase Auth (frontend)
        │
        ├──► Firebase SDK handles auth (email/password, Google, etc.)
        │
        └──► On successful auth → frontend calls backend /api/auth/sync
                │
                └──► Backend verifies Firebase ID token
                     └──► Creates/updates user in MongoDB
```

**No webhooks needed.** Firebase doesn't use Svix/webhooks like Clerk. Instead, the frontend sends the Firebase ID token to the backend after every login, and the backend verifies it + syncs to MongoDB.

---

## Folder Structure (Final)

```
ANT DESGIN/
├── clear front/                    # React frontend
│   ├── .env                        # VITE_FIREBASE_* keys
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                # App entry, no auth provider wrapping needed
│       ├── App.jsx                 # Routes + auth-gated UI
│       ├── firebase.js             # Firebase app init + auth export
│       ├── hooks/
│       │   └── useMongoUser.js     # Hook: sync Firebase user → MongoDB on login
│       ├── pages/
│       │   ├── SignIn.jsx          # Firebase email/password sign in
│       │   ├── SignUp.jsx          # Firebase email/password sign up
│       │   └── Dashboard.jsx       # Protected page (example)
│       └── components/
│           └── AuthGuard.jsx       # Component that redirects if not logged in
│
├── server-clear/                   # Express backend
│   ├── .env                        # MONGODB_URI, FIREBASE_PROJECT_ID
│   ├── package.json
│   ├── server.js                   # Entry point
│   ├── db.js                       # Mongoose connection
│   ├── middleware/
│   │   └── verifyFirebaseToken.js  # Middleware: verify Firebase ID token
│   ├── models/
│   │   └── User.js                 # Mongoose User schema
│   └── routes/
│       ├── auth.js                 # POST /api/auth/sync
│       └── users.js                # GET /api/me (protected)
│
└── .git/
```

---

## Phase 1 — Frontend: Firebase Setup

### 1.1 Install Firebase SDK
```bash
cd "clear front"
npm uninstall @clerk/react
npm install firebase
```

### 1.2 Create `src/firebase.js`
```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
```

### 1.3 Create `clear front/.env`
```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```
Get these values from **Firebase Console → Project Settings → General → Your apps → Web app config**.

---

## Phase 2 — Frontend: Auth Pages

### 2.1 `src/pages/SignUp.jsx`
```jsx
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Form, Input, Button, Typography, message } from 'antd';

const { Title } = Typography;

export default function SignUp() {
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ email, password, firstName, lastName }) => {
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: `${firstName} ${lastName}` });

      // Sync to MongoDB
      const token = await user.getIdToken();
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName }),
      });

      message.success('Account created!');
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={onFinish} style={{ maxWidth: 400, margin: '80px auto' }}>
      <Title level={3}>Sign Up</Title>
      <Form.Item name="firstName" rules={[{ required: true }]}><Input placeholder="First Name" /></Form.Item>
      <Form.Item name="lastName" rules={[{ required: true }]}><Input placeholder="Last Name" /></Form.Item>
      <Form.Item name="email" rules={[{ required: true, type: 'email' }]}><Input placeholder="Email" /></Form.Item>
      <Form.Item name="password" rules={[{ required: true, min: 6 }]}><Input.Password placeholder="Password" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>Sign Up</Button>
    </Form>
  );
}
```

### 2.2 `src/pages/SignIn.jsx`
```jsx
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Form, Input, Button, Typography, message } from 'antd';

const { Title } = Typography;

export default function SignIn() {
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ email, password }) => {
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // Sync to MongoDB (creates if first time, updates if exists)
      const token = await user.getIdToken();
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      message.success('Signed in!');
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={onFinish} style={{ maxWidth: 400, margin: '80px auto' }}>
      <Title level={3}>Sign In</Title>
      <Form.Item name="email" rules={[{ required: true, type: 'email' }]}><Input placeholder="Email" /></Form.Item>
      <Form.Item name="password" rules={[{ required: true }]}><Input.Password placeholder="Password" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>Sign In</Button>
    </Form>
  );
}
```

### 2.3 `src/App.jsx`
```jsx
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Button, Layout, Space } from 'antd';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import './App.css';

const { Header, Content } = Layout;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('signin'); // 'signin' | 'signup'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <>
        {page === 'signin' ? <SignIn /> : <SignUp />}
        <div style={{ textAlign: 'center' }}>
          {page === 'signin' ? (
            <Button type="link" onClick={() => setPage('signup')}>Don't have an account? Sign Up</Button>
          ) : (
            <Button type="link" onClick={() => setPage('signin')}>Already have an account? Sign In</Button>
          )}
        </div>
      </>
    );
  }

  return (
    <Layout>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff' }}>Welcome, {user.displayName || user.email}</span>
        <Button onClick={() => signOut(auth)}>Sign Out</Button>
      </Header>
      <Content style={{ padding: 24 }}>
        <p>You are signed in as {user.email}</p>
      </Content>
    </Layout>
  );
}
```

### 2.4 `src/main.jsx`
```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```
No `ClerkProvider` wrapping needed — Firebase auth state is handled via `onAuthStateChanged`.

### 2.5 `src/hooks/useMongoUser.js`
```js
import { useState, useEffect } from 'react';
import { auth } from '../firebase';

export default function useMongoUser() {
  const [mongoUser, setMongoUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setMongoUser(null);
        return;
      }
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMongoUser(await res.json());
      }
    });
    return unsub;
  }, []);

  return mongoUser;
}
```

---

## Phase 3 — Backend: Firebase Admin + Token Verification

### 3.1 Install dependencies
```bash
cd server-clear
npm uninstall @clerk/express svix
npm install firebase-admin
```

### 3.2 `server-clear/.env`
```
MONGODB_URI=mongodb://localhost:27017/GOGM
FIREBASE_PROJECT_ID=your-project
PORT=5000
```
**Note:** Firebase Admin SDK can verify tokens with just the project ID (no service account file needed for token verification only).

### 3.3 `server-clear/server.js`
```js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use(authRouter);
app.use(usersRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3.4 `server-clear/db.js`
```js
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

export default mongoose;
```

### 3.5 `server-clear/middleware/verifyFirebaseToken.js`
```js
import admin from 'firebase-admin';

// Initialize Firebase Admin (once)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

export default async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // { uid, email, name, picture, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### 3.6 `server-clear/models/User.js`
```js
import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email:       { type: String, required: true },
  firstName:   String,
  lastName:    String,
  photoURL:    String,
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

export default model('User', userSchema);
```

### 3.7 `server-clear/routes/auth.js`
```js
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
```

### 3.8 `server-clear/routes/users.js`
```js
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
```

---

## Phase 4 — Vite Proxy (dev only)

### `clear front/vite.config.js`
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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

## Phase 5 — Remove Clerk Leftovers

### Frontend (`clear front/`)
- Remove `@clerk/react` from `package.json`
- Remove `ClerkProvider` from `main.jsx`
- Remove all `@clerk/react` imports (`Show`, `SignInButton`, `SignUpButton`, `UserButton`)
- Delete `controller.js` (old `useMongoUser` with Clerk)

### Backend (`server-clear/`)
- Remove `@clerk/express` from `package.json`
- Remove `svix` from `package.json`
- Delete old `routes/webhooks.js` (no webhooks needed with Firebase)

---

## How It Works — Sync Flow

| Event | What Happens |
|---|---|
| **User signs up** | `createUserWithEmailAndPassword()` → `getIdToken()` → `POST /api/auth/sync` → `User.findOneAndUpdate(upsert: true)` creates doc |
| **User signs in** | `signInWithEmailAndPassword()` → `getIdToken()` → `POST /api/auth/sync` → updates `updatedAt` |
| **Frontend needs MongoDB user** | `useMongoUser()` hook → `GET /api/me` with Bearer token → returns MongoDB doc |
| **User deletes account** | Handle in Firebase Console, or add a `DELETE /api/me` route that calls `admin.auth().deleteUser(uid)` + `User.findOneAndDelete()` |

---

## How to Test

1. `cd server-clear && npm start` → should print "Server running on port 5000" + "Connected to MongoDB"
2. `cd "clear front" && npm run dev` → opens React app
3. Sign up with email/password
4. Check MongoDB: `mongosh` → `use GOGM` → `db.users.find().pretty()`
5. You should see a document with `firebaseUid`, `email`, `firstName`, `lastName`

---

## Security Notes

- **Always verify Firebase ID tokens on the backend** — never trust the frontend payload alone
- **Firebase Admin `verifyIdToken()`** checks signature, expiry, and issuer automatically
- **No service account JSON needed** for token verification — just `FIREBASE_PROJECT_ID`
- **Never expose Firebase Admin credentials** to the frontend
- **`upsert: true`** in the sync route means duplicate calls are safe (idempotent)
- **No ngrok needed** — there are no webhooks; sync is triggered by the frontend
