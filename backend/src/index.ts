import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BikeSystem API is running' });
});

// Test de conexión a la base de datos
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as hora, version() as version');
    res.json({ 
      status: 'ok', 
      connected: true, 
      time: result.rows[0].hora,
      version: result.rows[0].version 
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      connected: false, 
      error: err instanceof Error ? err.message : 'Error desconocido' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Server]: 🚴 Backend corriendo en http://localhost:${PORT}`);
});
