import { Client, Pool } from 'pg';
import dotenv from 'dotenv';
import { escribirLog } from '../utils/logger.js';

dotenv.config(process.env.DOTENV_CONFIG_PATH ? { path: process.env.DOTENV_CONFIG_PATH } : undefined);

// Si la conexión no es a localhost/127.0.0.1, se activa SSL (requerido por Supabase / nube)
const esRemota = Boolean(
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('localhost') &&
    !process.env.DATABASE_URL.includes('127.0.0.1')
);

/** Cliente PostgreSQL que configura la zona horaria de Argentina antes de quedar disponible en el pool. */
class ArgentinaClient extends Client {
    override connect(): Promise<this>;
    override connect(callback: ((err: Error) => void) | ((err: null, c: this) => void)): void;
    override connect(
        callback?: ((err: Error) => void) | ((err: null, c: this) => void)
    ): Promise<this> | void {
        if (callback) {
            const cb = callback as (err: Error | null, client?: this) => void;
            super.connect((err: Error | null) => {
                if (err) {
                    cb(err);
                    return;
                }
                this.query("SET TIME ZONE 'America/Argentina/Buenos_Aires'", (tzErr) => {
                    if (tzErr) {
                        cb(tzErr);
                        return;
                    }
                    cb(null, this);
                });
            });
            return;
        }

        return super.connect().then(async () => {
            await this.query("SET TIME ZONE 'America/Argentina/Buenos_Aires'");
            return this;
        });
    }
}

/** Instancia centralizada del pool de conexiones PostgreSQL. */
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: esRemota ? { rejectUnauthorized: false } : false,
    Client: ArgentinaClient,
    max: 10,
    min: 0,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
    console.log('[DB]: Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[DB]: Error inesperado en cliente inactivo del pool', err);
    escribirLog('ERROR', 'DB', 'Error inesperado en cliente inactivo del pool', err);
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