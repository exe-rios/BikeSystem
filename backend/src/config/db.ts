import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Si la conexión no es a localhost/127.0.0.1, se activa SSL (requerido por Supabase / nube)
const esRemota = Boolean(
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('localhost') &&
    !process.env.DATABASE_URL.includes('127.0.0.1')
);

/** Instancia centralizada del pool de conexiones PostgreSQL. */
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: esRemota ? { rejectUnauthorized: false } : false,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
    console.log('[DB]: Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[DB]: Error inesperado en cliente inactivo del pool', err);
});

/** Cierra de forma ordenada el pool de conexiones a la base de datos. */
export const cerrarPool = async (): Promise<void> => {
    try {
        await pool.end();
        console.log('[DB]: Pool de conexiones cerrado correctamente');
    } catch (err) {
        console.error('[DB]: Error al cerrar el pool de conexiones', err);
    }
};