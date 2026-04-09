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