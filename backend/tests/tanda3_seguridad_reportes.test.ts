import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { ReporteService } from '../src/services/reporte.service.js';
import { ProductoService } from '../src/services/producto.service.js';
import { UsuarioService } from '../src/services/usuario.service.js';
import { ClienteService } from '../src/services/cliente.service.js';
import { validarId } from '../src/utils/validation.js';
import { normalizarPaginacion } from '../src/utils/pagination.js';
import { manejarErrores } from '../src/middlewares/error.middleware.js';
import {
  verificarToken,
  revocarTokensUsuario,
  limpiarTokensRevocados,
} from '../src/middlewares/auth.middleware.js';
import productoRouter from '../src/routes/producto.routes.js';
import ventaRouter from '../src/routes/venta.routes.js';
import reporteRouter from '../src/routes/reporte.routes.js';
import authRouter from '../src/routes/auth.routes.js';
import { BadRequestError, ConflictError, ForbiddenError } from '../src/utils/errors.js';
import { pool } from '../src/config/db.js';

const TEST_SECRET = 'test_jwt_secret_key_tanda3';

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

describe('Tanda 3 — Reportes, RBAC, Revocación JWT, Validación y Errores', () => {
  let app: express.Express;
  let tokenAdmin: string;
  let tokenEmpleado: string;
  let mockClient: any;

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    tokenAdmin = jwt.sign({ id: 1, rol: 'ADMIN', nombre_usuario: 'admin' }, TEST_SECRET, { expiresIn: '1h' });
    tokenEmpleado = jwt.sign({ id: 2, rol: 'EMPLEADO', nombre_usuario: 'empleado' }, TEST_SECRET, { expiresIn: '1h' });

    app = express();
    app.use(express.json());
    app.use('/api', authRouter);
    app.use('/api/productos', productoRouter);
    app.use('/api/ventas', ventaRouter);
    app.use('/api/reportes', reporteRouter);
    app.use(manejarErrores);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    limpiarTokensRevocados();
    mockClient = await pool.connect();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.query as any).mockReset();
  });

  describe('1. Reportes: dashboard por rol y validación estricta de fechas', () => {
    it('EMPLEADO recibe finanzas: null y top_productos sin total_recaudado en dashboard', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ estado: 'Recibida', cantidad: '3' }] }) // queryTaller
        .mockResolvedValueOnce({ rows: [] }) // queryStock
        .mockResolvedValueOnce({
          rows: [{ id_producto: 10, nombre: 'Cadena', tipo_prod: 'repuesto', marca: 'KMC', total_vendido: 5 }],
        }); // queryTopProductos (sin queryGanancias)

      const res = await request(app)
        .get('/api/reportes/dashboard')
        .set('Authorization', `Bearer ${tokenEmpleado}`);

      expect(res.status).toBe(200);
      expect(res.body.finanzas).toBeNull();
      expect(res.body.total_taller_activo).toBe(3);
      expect(res.body.top_productos[0]).not.toHaveProperty('total_recaudado');
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('ADMIN recibe finanzas calculadas y total_recaudado en dashboard', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ ventas_mes: '10000', taller_mes: '5000', egresos_proveedores_mes: '3000' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id_producto: 10, nombre: 'Cadena', tipo_prod: 'repuesto', marca: 'KMC', total_vendido: 5, total_recaudado: '25000' }],
        });

      const dash = await ReporteService.obtenerDashboard({ rolUsuario: 'ADMIN' });
      expect(dash.finanzas).toEqual({
        ventas_mostrador: 10000,
        ingresos_taller: 5000,
        total_mes: 15000,
        egresos_proveedores: 3000,
        balance_neto_mes: 12000,
      });
      expect(dash.top_productos[0].total_recaudado).toBe('25000');
    });

    it('rechaza fechas inválidas ("abc", "2026-02-31") y rangos invertidos con 400', async () => {
      await expect(ReporteService.obtenerEstadisticas({ fechaDesde: 'abc' })).rejects.toThrow(BadRequestError);
      await expect(ReporteService.obtenerEstadisticas({ fechaHasta: '2026-02-31' })).rejects.toThrow(BadRequestError);
      await expect(
        ReporteService.obtenerVentasReporte({ fechaDesde: '2026-06-15', fechaHasta: '2026-06-01' })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('2. Seguridad RBAC, Revocación JWT y Último ADMIN', () => {
    it('bloquea con 403 si EMPLEADO intenta cambiar campo activo vía PUT /api/productos/:id', async () => {
      await expect(
        ProductoService.actualizarProducto(
          1,
          { activo: false },
          { idUsuarioOperador: 2, nombreUsuarioOperador: 'empleado', rolUsuarioOperador: 'EMPLEADO' }
        )
      ).rejects.toThrow(ForbiddenError);

      const res = await request(app)
        .put('/api/productos/1')
        .set('Authorization', `Bearer ${tokenEmpleado}`)
        .send({ activo: false });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/administrador/i);
    });

    it('permite a ADMIN cambiar activo en actualizarProducto', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id_producto: 1, nombre: 'Casco', tipo_prod: 'accesorio', cantidad: 4, precio: 1000, moneda: 'ARS', activo: true }],
        }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ id_producto: 1, activo: false }] }) // UPDATE Productos
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({}); // COMMIT
      (pool.query as any).mockResolvedValueOnce({ rows: [{ id_producto: 1, activo: false }] });

      const prod = await ProductoService.actualizarProducto(
        1,
        { activo: false },
        { idUsuarioOperador: 1, nombreUsuarioOperador: 'admin', rolUsuarioOperador: 'ADMIN' }
      );
      expect(prod.activo).toBe(false);
    });

    it('bloquea /api/db-test y anulación de ventas para EMPLEADO (403)', async () => {
      const resDb = await request(app).get('/api/db-test').set('Authorization', `Bearer ${tokenEmpleado}`);
      const resAnular = await request(app).put('/api/ventas/1/anular').set('Authorization', `Bearer ${tokenEmpleado}`).send({});

      expect(resDb.status).toBe(403);
      expect(resAnular.status).toBe(403);
    });

    it('SUPERADMIN no cuenta como ADMIN al proteger al único administrador del sistema', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ nombre_usuario: 'diego', rol: 'ADMIN' }] })
        .mockResolvedValueOnce({ rows: [{ admin_count: 0 }] });

      await expect(
        UsuarioService.eliminarUsuario(5, {
          idUsuarioOperador: 99,
          nombreUsuarioOperador: 'superadmin',
          rolOperador: 'SUPERADMIN',
        })
      ).rejects.toThrow(BadRequestError);

      const sqlAdmins = (pool.query as any).mock.calls[1][0];
      expect(sqlAdmins).toContain("rol = 'ADMIN'");
      expect(sqlAdmins).toContain("LOWER(nombre_usuario) != 'superadmin'");
    });

    it('rechaza JWT emitido antes de revocarTokensUsuario (401) y conserva 403 sin header', async () => {
      const tokenPrevio = jwt.sign({ id: 77, rol: 'ADMIN', nombre_usuario: 'temp' }, TEST_SECRET, { expiresIn: '1h' });
      revocarTokensUsuario(77);

      const resSinHeader = await request(app).get('/api/productos');
      expect(resSinHeader.status).toBe(403);

      const reqMock = { headers: { authorization: `Bearer ${tokenPrevio}` } } as any;
      const resMock = {
        statusCode: 200,
        body: null as any,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: any) {
          this.body = payload;
          return this;
        },
      } as any;
      const nextMock = vi.fn();

      verificarToken(reqMock, resMock, nextMock);
      expect(nextMock).not.toHaveBeenCalled();
      expect(resMock.statusCode).toBe(401);
      expect(resMock.body.error).toMatch(/revocada/i);
    });
  });

  describe('3. Medios Críticos: validarId, paginación, manejarErrores y Consumidor Final', () => {
    it('validarId rechaza booleanos, decimales, Infinity, overflow int32 y strings vacíos', () => {
      expect(() => validarId(true)).toThrow(BadRequestError);
      expect(() => validarId(1.5)).toThrow(BadRequestError);
      expect(() => validarId(Infinity)).toThrow(BadRequestError);
      expect(() => validarId(9999999999999)).toThrow(BadRequestError);
      expect(() => validarId('   ')).toThrow(BadRequestError);
      expect(validarId('42')).toBe(42);
    });

    it('normalizarPaginacion trunca decimales y acota valores no finitos', () => {
      expect(normalizarPaginacion({ limite: '15.9', pagina: '2.7' })).toEqual({
        limite: 15,
        pagina: 2,
        offset: 15,
        tienePaginacion: true,
      });
      expect(normalizarPaginacion({ limite: Infinity, pagina: NaN })).toEqual({
        limite: 10,
        pagina: 1,
        offset: 0,
        tienePaginacion: true,
      });
    });

    it('manejarErrores maneja headersSent, JSON inválido (400), payload grande (413), CORS (403) y PG 22007 (400)', () => {
      const makeRes = (headersSent = false) =>
        ({
          headersSent,
          statusCode: 200,
          payload: null as any,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(data: any) {
            this.payload = data;
            return this;
          },
        }) as any;

      const next = vi.fn();
      const sentErr = new Error('late');
      manejarErrores(sentErr, {} as any, makeRes(true), next);
      expect(next).toHaveBeenCalledWith(sentErr);

      const syntaxErr = Object.assign(new SyntaxError('bad json'), { body: '{' });
      const resSyntax = makeRes();
      manejarErrores(syntaxErr, {} as any, resSyntax, next);
      expect(resSyntax.statusCode).toBe(400);

      const resLarge = makeRes();
      manejarErrores({ type: 'entity.too.large' }, {} as any, resLarge, next);
      expect(resLarge.statusCode).toBe(413);

      const resCors = makeRes();
      manejarErrores(new Error('Bloqueado por política CORS'), {} as any, resCors, next);
      expect(resCors.statusCode).toBe(403);

      const resPgDate = makeRes();
      manejarErrores({ code: '22007' }, {} as any, resPgDate, next);
      expect(resPgDate.statusCode).toBe(400);
    });

    it('ClienteService protege a Consumidor Final de renombre/eliminación y permite limpiar email a null', async () => {
      (pool.query as any).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id_cliente: 1, nombre: 'Consumidor', apellido: 'Final', dni: '00000000' }],
      });
      await expect(ClienteService.eliminarCliente(1, {})).rejects.toThrow(ConflictError);

      (pool.query as any).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id_cliente: 1, nombre: 'Consumidor', apellido: 'Final', dni: '00000000' }],
      });
      await expect(ClienteService.actualizarCliente(1, { nombre: 'Otro' })).rejects.toThrow(ConflictError);

      (pool.query as any)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id_cliente: 5, nombre: 'Juan', apellido: 'Pérez', dni: '30111222' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id_cliente: 5, nombre: 'Juan', apellido: 'Pérez', dni: '30111222', email: null }],
        })
        .mockResolvedValueOnce({});

      const actualizado = await ClienteService.actualizarCliente(5, { email: '' });
      expect(actualizado.email).toBeNull();
      const updateCall = (pool.query as any).mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE Cliente')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1][5]).toBe(true); // tieneEmail
      expect(updateCall[1][6]).toBeNull(); // emailLimpio
    });
  });
});
