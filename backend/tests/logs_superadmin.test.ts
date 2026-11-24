import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/db.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
    on: vi.fn()
  }
}));

import { pool } from '../src/config/db.js';
import logsRouter from '../src/routes/logs.routes.js';
import { manejarErrores } from '../src/middlewares/error.middleware.js';
import { LogSistemaService } from '../src/services/logSistema.service.js';
import {
  sanitizarTextoLog,
  escribirLog,
  leerUltimasLineasLog,
  obtenerRutaArchivoLog,
  rotarLogSiCorresponde,
  registrarPersistenciaLogRemoto
} from '../src/utils/logger.js';

const TEST_SECRET = 'test_logs_jwt_secret_12345';

describe('Sistema de Logs Técnicos (Local + Remoto) y Acceso Exclusivo SUPERADMIN', () => {
  let tempLogDir: string;
  let prevLogDir: string | undefined;

  beforeEach(() => {
    prevLogDir = process.env.LOG_DIR;
    tempLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bikesystem-logs-'));
    process.env.LOG_DIR = tempLogDir;
    registrarPersistenciaLogRemoto(null);
    vi.clearAllMocks();
    (pool.query as any).mockReset();
  });

  afterEach(() => {
    registrarPersistenciaLogRemoto(null);
    if (prevLogDir === undefined) {
      delete process.env.LOG_DIR;
    } else {
      process.env.LOG_DIR = prevLogDir;
    }
    fs.rmSync(tempLogDir, { recursive: true, force: true });
  });

  describe('Sanitización, escritura, lectura y rotación (logger.ts)', () => {
    it('debe redactar credenciales PostgreSQL, Bearer tokens, JWT_SECRET y contraseñas', () => {
      process.env.DATABASE_URL = 'postgresql://user_db:super_clave@host:5432/postgres';
      process.env.JWT_SECRET = TEST_SECRET;

      const crudo =
        'Error conectando a postgresql://admin:secreto123@db.ejemplo.com:5432/prod con header Bearer eyJhbGciOiJIUzI1NiJ9.abc.xyz y {"contrasena":"miPassword123"} y JWT_SECRET=' +
        TEST_SECRET;

      const limpio = sanitizarTextoLog(crudo);

      expect(limpio).not.toContain('secreto123');
      expect(limpio).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(limpio).not.toContain('miPassword123');
      expect(limpio).not.toContain(TEST_SECRET);
      expect(limpio).toContain('postgresql://***:***@');
      expect(limpio).toContain('Bearer [REDACTED]');
    });

    it('debe escribir entradas en bikesystem.log y respetar el límite de líneas al leer', () => {
      escribirLog('INFO', 'SERVER', 'Servidor iniciado de prueba');
      escribirLog('WARN', 'STOCK', 'Stock bajo de prueba');
      escribirLog('ERROR', 'HTTP', 'GET /api/test -> 500', new Error('Fallo controlado'));

      const todas = leerUltimasLineasLog(100);
      expect(todas.existe).toBe(true);
      expect(todas.totalLineas).toBe(3);
      expect(todas.lineas[0]).toContain('[INFO] [SERVER]');
      expect(todas.lineas[2]).toContain('[ERROR] [HTTP]');
      expect(todas.lineas[2]).toContain('Fallo controlado');

      const ultimasDos = leerUltimasLineasLog(2);
      expect(ultimasDos.lineas).toHaveLength(2);
      expect(ultimasDos.lineas[0]).toContain('[WARN]');
      expect(ultimasDos.lineas[1]).toContain('[ERROR]');
    });

    it('debe rotar bikesystem.log -> bikesystem.1.log cuando supera maxBytes', () => {
      const ruta = obtenerRutaArchivoLog();
      fs.mkdirSync(tempLogDir, { recursive: true });
      fs.writeFileSync(ruta, 'A'.repeat(120), 'utf8');

      rotarLogSiCorresponde(ruta, 100);

      const rotado = path.join(tempLogDir, 'bikesystem.1.log');
      expect(fs.existsSync(rotado)).toBe(true);
      expect(fs.existsSync(ruta)).toBe(false);
    });
  });

  describe('Persistencia remota en Log_Sistema (LogSistemaService)', () => {
    it('debe sanitizar credenciales antes de ejecutar INSERT INTO Log_Sistema', async () => {
      (pool.query as any).mockResolvedValueOnce({ rows: [{ id_log: 1 }], rowCount: 1 });

      await LogSistemaService.guardarLogRemoto({
        nivel: 'ERROR',
        origen: 'HTTP',
        equipo: 'PC-DIEGO',
        usuario: 'Diego Nagel',
        mensaje: 'Fallo postgresql://postgres:mi_clave_secreta@db.supabase.co:5432/postgres',
        detalle: 'Bearer token_super_secreto_123'
      });

      expect(pool.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (pool.query as any).mock.calls[0];
      expect(sql).toContain('INSERT INTO Log_Sistema');
      expect(params[0]).toBe('ERROR');
      expect(params[1]).toBe('HTTP');
      expect(params[2]).toBe('PC-DIEGO');
      expect(params[3]).toBe('Diego Nagel');
      expect(params[4]).toContain('postgresql://***:***@');
      expect(params[4]).not.toContain('mi_clave_secreta');
      expect(params[5]).toContain('Bearer [REDACTED]');
      expect(params[5]).not.toContain('token_super_secreto_123');
    });
  });

  describe('Endpoints /api/logs (cliente autenticado y SUPERADMIN exclusivo)', () => {
    let app: express.Express;
    let tokenEmpleado: string;
    let tokenAdmin: string;
    let tokenSuperadmin: string;

    beforeAll(() => {
      process.env.JWT_SECRET = TEST_SECRET;
      tokenEmpleado = jwt.sign({ id: 2, rol: 'EMPLEADO', nombre_usuario: 'emp' }, TEST_SECRET, { expiresIn: '1h' });
      tokenAdmin = jwt.sign({ id: 3, rol: 'ADMIN', nombre_usuario: 'diego' }, TEST_SECRET, { expiresIn: '1h' });
      tokenSuperadmin = jwt.sign(
        { id: 1, rol: 'SUPERADMIN', nombre_usuario: 'superadmin' },
        TEST_SECRET,
        { expiresIn: '1h' }
      );

      app = express();
      app.use(express.json());
      app.use('/api/logs', logsRouter);
      app.use(manejarErrores);
    });

    it('POST /api/logs/cliente requiere token, valida mensaje y permite reportar a EMPLEADO y ADMIN', async () => {
      const resSinToken = await request(app).post('/api/logs/cliente').send({ mensaje: 'Error UI' });
      expect(resSinToken.status).toBe(403);

      const resInvalido = await request(app)
        .post('/api/logs/cliente')
        .set('Authorization', `Bearer ${tokenEmpleado}`)
        .send({ mensaje: '   ' });
      expect(resInvalido.status).toBe(400);

      const resEmp = await request(app)
        .post('/api/logs/cliente')
        .set('Authorization', `Bearer ${tokenEmpleado}`)
        .send({ mensaje: 'Crash en pantalla ventas', detalle: 'TypeError...' });
      expect(resEmp.status).toBe(204);

      const resAdmin = await request(app)
        .post('/api/logs/cliente')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nivel: 'WARN', mensaje: 'Advertencia UI' });
      expect(resAdmin.status).toBe(204);

      const logLocal = leerUltimasLineasLog(20);
      expect(logLocal.lineas.some((l) => l.includes('[FRONTEND]') && l.includes('Crash en pantalla ventas'))).toBe(
        true
      );
    });

    it('debe rechazar con 403 la lectura y descarga de logs locales y remotos si no es SUPERADMIN', async () => {
      const checks = [
        request(app).get('/api/logs'),
        request(app).get('/api/logs').set('Authorization', `Bearer ${tokenEmpleado}`),
        request(app).get('/api/logs').set('Authorization', `Bearer ${tokenAdmin}`),
        request(app).get('/api/logs/descargar').set('Authorization', `Bearer ${tokenAdmin}`),
        request(app).get('/api/logs/remotos').set('Authorization', `Bearer ${tokenEmpleado}`),
        request(app).get('/api/logs/remotos').set('Authorization', `Bearer ${tokenAdmin}`),
        request(app).get('/api/logs/remotos/descargar').set('Authorization', `Bearer ${tokenAdmin}`)
      ];

      const responses = await Promise.all(checks);
      for (const r of responses) {
        expect(r.status).toBe(403);
      }
    });

    it('debe permitir a SUPERADMIN consultar y descargar los logs locales y remotos', async () => {
      escribirLog('ERROR', 'HTTP', 'Error local visible solo para superadmin');

      const resLista = await request(app)
        .get('/api/logs?lineas=50')
        .set('Authorization', `Bearer ${tokenSuperadmin}`);
      expect(resLista.status).toBe(200);
      expect(resLista.body.existe).toBe(true);
      expect(resLista.body.lineas.some((l: string) => l.includes('Error local visible solo para superadmin'))).toBe(
        true
      );

      const resDescarga = await request(app)
        .get('/api/logs/descargar')
        .set('Authorization', `Bearer ${tokenSuperadmin}`);
      expect(resDescarga.status).toBe(200);
      expect(resDescarga.headers['content-type']).toContain('text/plain');
      expect(resDescarga.headers['content-disposition']).toContain('.log');

      (pool.query as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id_log: 10,
              nivel: 'ERROR',
              origen: 'HTTP',
              equipo: 'PC-DIEGO',
              usuario: 'Diego Nagel',
              mensaje: 'Error remoto en Supabase',
              detalle: null,
              created_at: '2026-11-24T21:00:00.000Z'
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [{ equipo: 'PC-DIEGO' }, { equipo: 'PC-DEV' }] });

      const resRemotos = await request(app)
        .get('/api/logs/remotos?equipo=PC-DIEGO')
        .set('Authorization', `Bearer ${tokenSuperadmin}`);
      expect(resRemotos.status).toBe(200);
      expect(resRemotos.body.total).toBe(1);
      expect(resRemotos.body.equipos).toEqual(['PC-DIEGO', 'PC-DEV']);
      expect(resRemotos.body.registros[0].mensaje).toBe('Error remoto en Supabase');

      (pool.query as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id_log: 10,
              nivel: 'ERROR',
              origen: 'HTTP',
              equipo: 'PC-DIEGO',
              usuario: 'Diego Nagel',
              mensaje: 'Error remoto descargable',
              detalle: null,
              created_at: '2026-11-24T21:00:00.000Z'
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [{ equipo: 'PC-DIEGO' }] });

      const resRemotosDescarga = await request(app)
        .get('/api/logs/remotos/descargar')
        .set('Authorization', `Bearer ${tokenSuperadmin}`);
      expect(resRemotosDescarga.status).toBe(200);
      expect(resRemotosDescarga.headers['content-type']).toContain('text/plain');
      expect(resRemotosDescarga.text).toContain('[PC-DIEGO]');
      expect(resRemotosDescarga.text).toContain('Error remoto descargable');
    });
  });
});
