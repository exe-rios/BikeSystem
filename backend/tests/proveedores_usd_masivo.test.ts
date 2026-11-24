import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import configuracionRouter from '../src/routes/configuracion.routes.js';
import productoRouter from '../src/routes/producto.routes.js';
import proveedorRouter from '../src/routes/proveedor.routes.js';
import { manejarErrores } from '../src/middlewares/error.middleware.js';
import { ConfiguracionService } from '../src/services/configuracion.service.js';
import { ProductoMasivoService } from '../src/services/productoMasivo.service.js';
import { pool } from '../src/config/db.js';
import { BadRequestError } from '../src/utils/errors.js';

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

describe('Precios USD/ARS, Carga Masiva, Proveedores y Aumento Masivo', () => {
  let app: express.Express;
  let tokenAdmin: string;
  let tokenSuperadmin: string;
  let tokenEmpleado: string;
  let mockClient: any;

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;

    tokenAdmin = jwt.sign({ id: 1, rol: 'ADMIN', nombre_usuario: 'Admin' }, TEST_SECRET, { expiresIn: '1h' });
    tokenSuperadmin = jwt.sign({ id: 99, rol: 'SUPERADMIN', nombre_usuario: 'Superadmin' }, TEST_SECRET, { expiresIn: '1h' });
    tokenEmpleado = jwt.sign({ id: 2, rol: 'EMPLEADO', nombre_usuario: 'Empleado' }, TEST_SECRET, { expiresIn: '1h' });

    app = express();
    app.use(express.json());
    app.use('/api/configuracion', configuracionRouter);
    app.use('/api/productos', productoRouter);
    app.use('/api/proveedores', proveedorRouter);
    app.use(manejarErrores);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClient = await pool.connect();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.query as any).mockReset();
  });

  describe('Seguridad por Roles (ADMIN/SUPERADMIN vs EMPLEADO)', () => {
    it('bloquea con 403 si EMPLEADO intenta modificar la cotización del dólar', async () => {
      const res = await request(app)
        .put('/api/configuracion/dolar')
        .set('Authorization', `Bearer ${tokenEmpleado}`)
        .send({ cotizacion_dolar: 1250 });

      expect(res.status).toBe(403);
    });

    it('bloquea con 403 si EMPLEADO intenta ejecutar carga masiva o aumento masivo', async () => {
      const resCarga = await request(app)
        .post('/api/productos/carga-masiva')
        .set('Authorization', `Bearer ${tokenEmpleado}`)
        .send({ items: [] });

      const resAumento = await request(app)
        .post('/api/productos/aumento-masivo')
        .set('Authorization', `Bearer ${tokenEmpleado}`)
        .send({ id_proveedor: 1, tipo_ajuste: 'porcentaje', valor: 10 });

      expect(resCarga.status).toBe(403);
      expect(resAumento.status).toBe(403);
    });

    it('permite a EMPLEADO consultar la cotización del dólar (solo lectura)', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ valor: '1235.50', updated_at: '2026-11-17', updated_by_nombre: 'Admin' }] })
        .mockResolvedValueOnce({ rows: [{ total: 12 }] });

      const res = await request(app)
        .get('/api/configuracion/dolar')
        .set('Authorization', `Bearer ${tokenEmpleado}`);

      expect(res.status).toBe(200);
      expect(res.body.cotizacion_dolar).toBe(1235.5);
      expect(res.body.productos_usd_count).toBe(12);
    });

    it('permite a ADMIN y SUPERADMIN actualizar la cotización del dólar y audita en Bitácora', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ valor: '1000.00' }] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // UPSERT Configuracion_Sistema
        .mockResolvedValueOnce({ rowCount: 5, rows: [{}, {}, {}, {}, {}] }) // UPDATE Productos
        .mockResolvedValueOnce({}) // INSERT Bitacora_Actividad
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .put('/api/configuracion/dolar')
        .set('Authorization', `Bearer ${tokenSuperadmin}`)
        .send({ cotizacion_dolar: 1215.75 });

      expect(res.status).toBe(200);
      expect(res.body.cotizacion_dolar).toBe(1215.75);
      expect(res.body.productos_actualizados).toBe(5);

      const llamadaBitacora = mockClient.query.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO Bitacora_Actividad')
      );
      expect(llamadaBitacora).toBeDefined();
      expect(llamadaBitacora[1][2]).toContain('1.215,75');
    });
  });

  describe('ConfiguracionService (Cotización manual USD -> ARS)', () => {
    it('rechaza cotizaciones <= 0 o inválidas', async () => {
      await expect(
        ConfiguracionService.actualizarCotizacionDolar(0, { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' })
      ).rejects.toThrow(BadRequestError);

      await expect(
        ConfiguracionService.actualizarCotizacionDolar(-500, { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('ProductoMasivoService.aumentoMasivoPorProveedor', () => {
    it('aplica aumento primero sobre precio_usd y recalcula precio ARS sin redondeo adicional', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 3, nombre_empresa: 'Shimano AR' }] }) // Proveedor
        .mockResolvedValueOnce({ rows: [{ valor: '1200' }] }) // Cotización USD = 1200
        .mockResolvedValueOnce({
          rows: [
            { id_producto: 10, nombre: 'Cambio Deore', marca: 'Shimano', modelo: 'M6100', tipo_prod: 'repuesto', moneda: 'USD', precio_usd: '50.25', precio: '60300.00' },
            { id_producto: 11, nombre: 'Cadena HG', marca: 'Shimano', modelo: 'HG40', tipo_prod: 'repuesto', moneda: 'ARS', precio_usd: null, precio: '15000.00' }
          ]
        }) // SELECT productos FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE prod 10
        .mockResolvedValueOnce({}) // UPDATE prod 11
        .mockResolvedValueOnce({}) // INSERT Bitacora_Actividad
        .mockResolvedValueOnce({}); // COMMIT

      const resultado = await ProductoMasivoService.aumentoMasivoPorProveedor(
        { id_proveedor: 3, tipo_ajuste: 'porcentaje', valor: 10, preview: false },
        { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
      );

      // 50.25 * 1.10 = 55.275 -> 55.28 USD; 55.28 * 1200 = 66336 ARS
      expect(resultado.items[0]!.precio_usd_nuevo).toBe(55.28);
      expect(resultado.items[0]!.precio_ars_nuevo).toBe(66336);
      // 15000 * 1.10 = 16500 ARS
      expect(resultado.items[1]!.precio_ars_nuevo).toBe(16500);
      expect(resultado.resumen_moneda).toEqual({ usd: 1, ars: 1 });

      const llamadaBitacora = mockClient.query.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO Bitacora_Actividad')
      );
      expect(llamadaBitacora).toBeDefined();
      expect(llamadaBitacora[1][2]).toContain('+10%');
      expect(llamadaBitacora[1][2]).toContain('Shimano AR');
    });
  });

  describe('ProductoMasivoService.ejecutarCargaMasiva con pago y auditoría', () => {
    it('inserta producto USD con conversión exacta a ARS, movimiento Kardex, pago al proveedor y bitácora', async () => {
      // Llamadas de previsualizarCargaMasiva (pool.query)
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ valor: '1250' }] }) // cotizacion
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 7, nombre_empresa: 'Venzo Distribuidora' }] }) // proveedor
        .mockResolvedValueOnce({ rows: [] }); // catálogo existente vacío

      // Llamadas transaccionales de ejecutarCargaMasiva (mockClient.query)
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ valor: '1250' }] }) // cotizacion
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 7, nombre_empresa: 'Venzo Distribuidora' }] }) // proveedor
        .mockResolvedValueOnce({ rows: [{ id_producto: 201 }] }) // INSERT Productos
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({}) // INSERT Producto_BiciNueva
        // PagoProveedorService.crearPago dentro de la transacción:
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ nombre_empresa: 'Venzo Distribuidora' }] }) // SELECT Proveedor
        .mockResolvedValueOnce({ rows: [{ id_pago: 55, monto_total: 500000 }] }) // INSERT Pago_Proveedor
        .mockResolvedValueOnce({}) // INSERT Bitacora_Actividad (Registro de Pago)
        // Auditoría de Carga Masiva:
        .mockResolvedValueOnce({}) // INSERT Bitacora_Actividad (Carga Masiva)
        .mockResolvedValueOnce({}); // COMMIT

      const res = await ProductoMasivoService.ejecutarCargaMasiva(
        {
          id_proveedor: 7,
          moneda_lote: 'USD',
          origen_formato: 'pdf',
          items: [
            {
              codigo: 'BICI-VNZ-29',
              nombre: 'Venzo Loki R29',
              tipo_prod: 'bicicleta',
              marca: 'Venzo',
              modelo: 'Loki',
              cantidad: 2,
              precio_usd: 400,
              genero: 'unisex'
            }
          ],
          pago: {
            registrar: true,
            id_metodo_pago: 4,
            monto_total: 500000,
            observaciones: 'Factura A-0001'
          }
        },
        { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
      );

      expect(res.insertados).toBe(1);
      expect(res.unidades_ingresadas).toBe(2);
      expect(res.pago.id_pago).toBe(55);

      const insertProdCall = mockClient.query.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO Productos')
      );
      // 400 USD * 1250 = 500000 ARS exactos, y código preservado en $1
      expect(insertProdCall[1][0]).toBe('BICI-VNZ-29');
      expect(insertProdCall[1][6]).toBe(500000);
      expect(insertProdCall[1][7]).toBe('USD');
      expect(insertProdCall[1][8]).toBe(400);
      expect(insertProdCall[1][14]).toBe(7);

      const bitacoraCalls = mockClient.query.mock.calls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO Bitacora_Actividad')
      );
      expect(bitacoraCalls).toHaveLength(2); // Pago + Carga Masiva
    });

    it('detecta productos existentes por código de artículo (ej. Peretti 0016930) aunque cambie la descripción', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ valor: '1250' }] }) // cotizacion_dolar
        .mockResolvedValueOnce({
          rows: [
            {
              id_producto: 42,
              id_proveedor: 5,
              codigo: '0016930',
              nombre: 'Candado SLP Viejo',
              marca: 'SLP',
              modelo: null,
              tipo_prod: 'repuesto',
              cantidad: 3,
              precio: '4000.00',
              moneda: 'ARS',
              precio_usd: null,
              rodado: null,
              talle: null,
              color: null,
              genero: null
            }
          ]
        });

      const preview = await ProductoMasivoService.previsualizarCargaMasiva({
        moneda_lote: 'ARS',
        modo_stock_default: 'sumar',
        items: [
          {
            codigo: '0016930',
            nombre: 'CANDADO SLP 18X1000 TIPO MOTO ROJO',
            tipo_prod: 'repuesto',
            cantidad: 12,
            precio: 4449.07,
            moneda: 'ARS'
          }
        ]
      });

      expect(preview.resumen.actualizar).toBe(1);
      expect(preview.resumen.nuevos).toBe(0);
      expect(preview.resumen.con_errores).toBe(0);
      expect(preview.items[0]!.accion).toBe('ACTUALIZAR');
      expect(preview.items[0]!.id_producto_existente).toBe(42);
      expect(preview.items[0]!.codigo).toBe('0016930');
      expect(preview.items[0]!.stock_resultante).toBe(15);
    });
  });

  describe('Cotización de Dólar Propia por Proveedor (PUT /api/proveedores/:id/dolar)', () => {
    it('bloquea con 403 si EMPLEADO intenta modificar el dólar de un proveedor', async () => {
      const res = await request(app)
        .put('/api/proveedores/5/dolar')
        .set('Authorization', `Bearer ${tokenEmpleado}`)
        .send({ cotizacion_dolar: 1850 });

      expect(res.status).toBe(403);
    });

    it('permite a ADMIN actualizar el dólar de un proveedor, recalcula sus productos y audita en Bitácora', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 5, nombre_empresa: 'PERETTI', cotizacion_dolar: '1785.00' }] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE Proveedor
        .mockResolvedValueOnce({ rowCount: 14, rows: Array(14).fill({}) }) // UPDATE Productos
        .mockResolvedValueOnce({}) // INSERT Bitacora_Actividad
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .put('/api/proveedores/5/dolar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ cotizacion_dolar: 1850 });

      expect(res.status).toBe(200);
      expect(res.body.nombre_empresa).toBe('PERETTI');
      expect(res.body.cotizacion_dolar).toBe(1850);
      expect(res.body.productos_actualizados).toBe(14);

      const bitacoraCall = mockClient.query.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO Bitacora_Actividad')
      );
      expect(bitacoraCall).toBeDefined();
      expect(bitacoraCall[1][2]).toContain('PERETTI');
      expect(bitacoraCall[1][2]).toContain('1.850,00');
    });
  });

  describe('Pagos Parciales y Agenda de Próximos Pagos a Proveedores', () => {
    it('registra pago parcial en carga masiva y agenda el saldo pendiente con fecha de próximo pago', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ valor: '1250' }] }) // cotizacion preview
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 5, nombre_empresa: 'PERETTI' }] }) // prov preview
        .mockResolvedValueOnce({ rows: [] }); // catálogo existente

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ valor: '1250' }] }) // cotizacion tx
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 5, nombre_empresa: 'PERETTI' }] }) // prov tx
        .mockResolvedValueOnce({ rows: [{ id_producto: 301 }] }) // INSERT Productos
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ nombre_empresa: 'PERETTI' }] }) // crearPago lookup prov
        .mockResolvedValueOnce({ rows: [{ id_pago: 88, monto_total: '1000000.00' }] }) // INSERT Pago_Proveedor
        .mockResolvedValueOnce({}) // INSERT Bitacora pago
        .mockResolvedValueOnce({
          rows: [{
            id_pendiente: 12,
            id_proveedor: 5,
            numero_factura: '0015-00081166',
            monto_factura_total: '2189000.45',
            monto_pagado: '1000000.00',
            saldo_pendiente: '1189000.45',
            fecha_proximo_pago: '2026-12-16',
            estado: 'PENDIENTE'
          }]
        }) // INSERT Pago_Proveedor_Pendiente
        .mockResolvedValueOnce({}) // INSERT Bitacora carga masiva
        .mockResolvedValueOnce({}); // COMMIT

      const res = await ProductoMasivoService.ejecutarCargaMasiva(
        {
          id_proveedor: 5,
          moneda_lote: 'ARS',
          origen_formato: 'pdf',
          items: [
            {
              codigo: '0016930',
              nombre: 'CANDADO SLP 18X1000 TIPO MOTO ROJO',
              tipo_prod: 'repuesto',
              cantidad: 12,
              precio: 4449.07,
              moneda: 'ARS'
            }
          ],
          pago: {
            registrar: true,
            id_metodo_pago: 4,
            monto_total: 1000000,
            moneda: 'ARS',
            monto_factura_total: 2189000.45,
            numero_factura: '0015-00081166',
            fecha_factura: '16/11/2026',
            fecha_proximo_pago: '2026-12-16',
            observaciones: 'Factura Nº 0015-00081166 - Fecha 16/11/2026'
          }
        },
        { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
      );

      expect(res.pago.id_pago).toBe(88);
      expect(res.pago_pendiente).toBeDefined();
      expect(res.pago_pendiente.id_pendiente).toBe(12);
      expect(res.pago_pendiente.saldo_pendiente).toBe('1189000.45');

      const insertPendCall = mockClient.query.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO Pago_Proveedor_Pendiente')
      );
      expect(insertPendCall).toBeDefined();
      expect(insertPendCall[1][3]).toBe('0015-00081166');
      expect(insertPendCall[1][7]).toBe(1189000.45);
      expect(insertPendCall[1][9]).toBe('2026-12-16');
    });
  });

  describe('Precio de Reventa en Repuestos (Porcentaje ajustable y Venta Mayorista)', () => {
    it('calcula y persiste precio_reventa a partir de costo y porcentaje_reventa en carga masiva', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ valor: '1250' }] })
        .mockResolvedValueOnce({ rows: [] });

      const preview = await ProductoMasivoService.previsualizarCargaMasiva({
        moneda_lote: 'ARS',
        items: [
          {
            codigo: '0016930',
            nombre: 'CANDADO SLP 18X1000',
            tipo_prod: 'repuesto',
            cantidad: 10,
            costo_usd: 10000,
            porcentaje_ganancia: 0.6,
            precio: 16000,
            porcentaje_reventa: 25,
            moneda: 'ARS'
          }
        ]
      });

      expect(preview.resumen.con_errores).toBe(0);
      expect(preview.items[0]!.porcentaje_reventa).toBe(0.25);
      expect(preview.items[0]!.precio_reventa).toBe(12500);
    });

    it('cobra el precio_reventa oficial de la DB cuando VentaService.crearVenta recibe tipo_precio = reventa', async () => {
      const { VentaService } = await import('../src/services/venta.service.js');

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_venta: 500 }] }) // INSERT Venta
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{
            id_producto: 10,
            nombre: 'Cubierta Maxxis 29',
            marca: 'Maxxis',
            modelo: null,
            tipo_prod: 'repuesto',
            cantidad: 20,
            precio: '50000.00',
            precio_reventa: '38000.00',
            activo: true
          }]
        }) // SELECT Producto FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ id_detalle: 1, precio_unitario: 38000, costo_total: 76000 }] }) // INSERT Detalle_Venta
        .mockResolvedValueOnce({}) // UPDATE stock
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({ rows: [{ id_venta: 500, costo_total: 76000 }] }) // UPDATE Venta total
        .mockResolvedValueOnce({}) // Bitacora
        .mockResolvedValueOnce({}); // COMMIT

      const res = await VentaService.crearVenta({
        id_cliente: 2,
        id_metodo_pago: 1,
        tipo_precio: 'reventa',
        detalles: [{ id_producto: 10, cantidad: 2 }],
        idUsuarioOperador: 1,
        nombreUsuarioOperador: 'Diego'
      });

      expect(res.venta.costo_total).toBe(76000);
      const insertDetalle = mockClient.query.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO Detalle_Venta')
      );
      expect(insertDetalle[1][3]).toBe(38000);
      expect(insertDetalle[1][4]).toBe(76000);
    });
  });
});
