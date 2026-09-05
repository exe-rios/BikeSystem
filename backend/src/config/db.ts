import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Si la conexión no es a localhost/127.0.0.1, se activa SSL (requerido por Supabase / nube)
const esRemota = Boolean(
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('localhost') &&
    !process.env.DATABASE_URL.includes('127.0.0.1')
);

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: esRemota ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
    console.log('[DB]: Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[DB]: Error en la conexión', err);
});