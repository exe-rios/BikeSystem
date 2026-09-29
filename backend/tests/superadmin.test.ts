import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import usuarioRouter from '../src/routes/usuario.routes.js';
import bitacoraRouter from '../src/routes/bitacora.routes.js';
import { manejarErrores } from '../src/middlewares/error.middleware.js';
import { pool } from '../src/config/db.js';

const TEST_SECRET = 'test_jwt_secret_key_12345';

vi.mock('../src/config/db.js', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  return {
    pool: {
      query: vi.fn(),
      connect: vi.fn(() => Promise.resolve(mockClient)),
      on: vi.fn(),
    },
  };
});

describe('Pruebas de Seguridad y Ocultamiento de Superadmin', () => {
  let app: express.Express;
  let tokenAdmin: string;
  let tokenSuperadmin: string;
  let tokenEmpleado: string;

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;

    tokenSuperadmin = jwt.sign(
      { id: 99, rol: 'SUPERADMIN', nombre_usuario: 'superadmin' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );

    tokenAdmin = jwt.sign(
      { id: 1, rol: 'ADMIN', nombre_usuario: 'admin' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );

    tokenEmpleado = jwt.sign(
      { id: 2, rol: 'EMPLEADO', nombre_usuario: 'empleado' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );

    app = express();
    app.use(express.json());
    app.use('/api/usuarios', usuarioRouter);
    app.use('/api/bitacora', bitacoraRouter);
    app.use(manejarErrores);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. GET /api/usuarios como ADMIN oculta al superadmin en la consulta a la BD', async () => {
    (pool.query as any).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_usuario: 1, nombre_usuario: 'admin', rol: 'ADMIN' }]
    });

    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    const sqlLlamado = (pool.query as any).mock.calls[0][0];
    expect(sqlLlamado).toContain("rol != 'SUPERADMIN'");
    expect(sqlLlamado).toContain("LOWER(nombre_usuario) != 'superadmin'");
  });

  it('2. GET /api/usuarios como SUPERADMIN incluye al superadmin en la consulta a la BD', async () => {
    (pool.query as any).mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { id_usuario: 1, nombre_usuario: 'admin', rol: 'ADMIN' },
        { id_usuario: 99, nombre_usuario: 'superadmin', rol: 'SUPERADMIN' }
      ]
    });

    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenSuperadmin}`);

    expect(res.status).toBe(200);
    const sqlLlamado = (pool.query as any).mock.calls[0][0];
    expect(sqlLlamado).not.toContain("rol != 'SUPERADMIN'");
  });

  it('3. POST /api/usuarios no permite crear un usuario con rol SUPERADMIN', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre_usuario: 'nuevo_super',
        contrasena: 'password123',
        rol: 'SUPERADMIN'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no se puede crear usuarios con el rol superadmin/i);
  });

  it('4. POST /api/usuarios no permite crear un usuario con nombre "superadmin"', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre_usuario: 'superadmin',
        contrasena: 'password123',
        rol: 'ADMIN'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/está reservado/i);
  });

  it('5. DELETE /api/usuarios/:id prohibe eliminar la cuenta de superadmin', async () => {
    (pool.query as any).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_usuario: 99, nombre_usuario: 'superadmin', rol: 'SUPERADMIN' }]
    });

    const res = await request(app)
      .delete('/api/usuarios/99')
      .set('Authorization', `Bearer ${tokenSuperadmin}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/superadministrador/i);
  });

  it('6. DELETE /api/usuarios/:id ejecutado por ADMIN sobre superadmin devuelve 404 (ocultamiento)', async () => {
    (pool.query as any).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_usuario: 99, nombre_usuario: 'superadmin', rol: 'SUPERADMIN' }]
    });

    const res = await request(app)
      .delete('/api/usuarios/99')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no existe/i);
  });

  it('7. GET /api/bitacora como ADMIN excluye registros de actividad de superadmin', async () => {
    (pool.query as any).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_bitacora: 1, nombre_usuario: 'admin', accion: 'Login', total_registros: 1 }]
    });

    const res = await request(app)
      .get('/api/bitacora')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    const sqlLlamado = (pool.query as any).mock.calls[0][0];
    expect(sqlLlamado).toContain("LOWER(b.nombre_usuario) != 'superadmin'");
    expect(sqlLlamado).toContain("u.rol != 'SUPERADMIN'");
  });

  it('8. GET /api/bitacora como SUPERADMIN puede ver sus propios registros', async () => {
    (pool.query as any).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_bitacora: 1, nombre_usuario: 'superadmin', accion: 'Login', total_registros: 1 }]
    });

    const res = await request(app)
      .get('/api/bitacora')
      .set('Authorization', `Bearer ${tokenSuperadmin}`);

    expect(res.status).toBe(200);
    const sqlLlamado = (pool.query as any).mock.calls[0][0];
    expect(sqlLlamado).not.toContain("LOWER(b.nombre_usuario) != 'superadmin'");
  });
});
