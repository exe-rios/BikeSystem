import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BikeSystem API is running' });
});

app.listen(PORT, () => {
  console.log(`[Server]: 🚴 Backend corriendo en http://localhost:${PORT}`);
});
