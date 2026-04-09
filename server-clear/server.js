import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import './db.js';
import { handleClerkWebhook } from './routes/webhooks.js';
import usersRouter from './routes/users.js';


const app = express();
const PORT = process.env.PORT || 5000;

// Webhook route — must come before other middleware
app.post('/api/webhooks/clerk', express.json(), handleClerkWebhook);

// Middleware
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// Routes
app.use(usersRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
