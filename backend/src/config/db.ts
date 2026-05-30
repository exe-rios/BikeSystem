import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
    console.log('[DB]: Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[DB]: Error en la conexión', err);
});