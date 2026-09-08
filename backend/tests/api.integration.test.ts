import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import productoRouter from '../src/routes/producto.routes.js';
import ventaRouter from '../src/routes/venta.routes.js';
import detalleReparacionRouter from '../src/routes/detalleReparacion.routes.js';
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

describe('Pruebas de Integración de API HTTP y Middlewares (Supertest)', () => {
  let app: express.Express;
  let tokenAdmin: string;
  let tokenEmpleado: string;
  let mockClient: any;

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;

    tokenAdmin = jwt.sign(
      { id: 1, rol: 'ADMIN', nombre_usuario: 'Administrador' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );

    tokenEmpleado = jwt.sign(
      { id: 2, rol: 'EMPLEADO', nombre_usuario: 'Empleado Taller' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );

    app = express();
    app.use(express.json());
    app.use('/api/productos', productoRouter);
    app.use('/api/ventas', ventaRouter);
    app.use('/api/reparaciones/repuestos', detalleReparacionRouter);
    app.use(manejarErrores);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClient = await pool.connect();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.query as any).mockReset();
  });

  describe('Seguridad y Middleware de Autenticación (verificarToken)', () => {
    it('debe responder 403 si no se envía la cabecera Authorization', async () => {
      const res = await request(app).get('/api/productos');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Tenés que iniciar sesión primero.');
    });

    it('debe responder 401 si el token JWT es inválido o corrupto', async () => {
      const res = await request(app)
        .get('/api/productos')
        .set('Authorization', 'Bearer token_invalido_xyz');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Tu sesión expiró. Volvé a iniciar sesión.');
    });
  });

  describe('Control de Acceso Basado en Roles (autorizarRoles)', () => {
    it('debe bloquear con 403 si un EMPLEADO intenta crear un producto nuevo en catálogo', async () => {
      const res = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${tokenEmpleado}`)
        .send({
          nombre: 'Manubrio Carbono',
          tipo_prod: 'repuesto',
          precio: 4500,
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'No tenés permisos para hacer esto.');
    });

    it('debe permitir a un EMPLEADO listar productos en mostrador (200 OK)', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({
          rows: [{ total_articulos: 1, total_unidades: 10, bajo_stock_count: 0, inactivos_count: 0 }],
        }) // queryResumen
        .mockResolvedValueOnce({
          rows: [{ id_producto: 1, nombre: 'Cadena KMC', cantidad: 10, precio: 3000, activo: true }],
        }); // queryPrincipal

      const res = await request(app)
        .get('/api/productos')
        .set('Authorization', `Bearer ${tokenEmpleado}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('productos');
      expect(res.body.productos.length).toBe(1);
    });

    it('debe permitir a un EMPLEADO registrar una venta de mostrador (201 Created)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_venta: 101 }] }) // INSERT Venta
        .mockResolvedValueOnce({
          rows: [{ id_producto: 1, nombre: 'Cámara 29', cantidad: 10, precio: 2000, activo: true, tipo_prod: 'repuesto' }],
          rowCount: 1,
        }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ id_detalle_venta: 1, costo_total: 2000 }] }) // INSERT Detalle
        .mockResolvedValueOnce({}) // UPDATE Productos
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({ rows: [{ id_venta: 101, costo_total: 2000 }] }) // UPDATE Total Venta
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/ventas')
        .set('Authorization', `Bearer ${tokenEmpleado}`)
        .send({
          id_cliente: 3,
          detalles: [{ id_producto: 1, cantidad: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('venta');
      expect(res.body.venta.id_venta).toBe(101);
    });
  });

  describe('Manejo Centralizado de Errores y Validaciones de Entrada', () => {
    it('debe responder 400 Bad Request si los datos enviados son inválidos', async () => {
      const res = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          nombre: '', // Nombre inválido
          tipo_prod: 'tipo_inexistente',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('debe responder 400 Bad Request si el ID de ruta no es numérico', async () => {
      const res = await request(app)
        .get('/api/productos/no-es-un-numero')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'No se encontró ese producto.');
    });
  });
});
