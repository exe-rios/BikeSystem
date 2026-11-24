import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfiguracionService } from '../src/services/configuracion.service.js';
import { ProductoService } from '../src/services/producto.service.js';
import { ProveedorService } from '../src/services/proveedor.service.js';
import { ReparacionService } from '../src/services/reparacion.service.js';
import { DetalleReparacionService } from '../src/services/detalleReparacion.service.js';
import { PagoProveedorService } from '../src/services/pagoProveedor.service.js';
import { VentaService } from '../src/services/venta.service.js';
import { pool } from '../src/config/db.js';

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

describe('Tanda 5 — Correcciones de Pulido y Casos Borde', () => {
  let mockClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClient = await pool.connect();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.query as any).mockReset();
  });

  it('ConfiguracionService.actualizarCotizacionDolar solo recalcula productos activos', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ valor: '1200' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({}) // UPSERT Configuracion_Sistema
      .mockResolvedValueOnce({ rowCount: 3, rows: [{}, {}, {}] }) // UPDATE Productos
      .mockResolvedValueOnce({}) // Bitacora
      .mockResolvedValueOnce({}); // COMMIT

    const res = await ConfiguracionService.actualizarCotizacionDolar(1300, {
      idUsuarioOperador: 1,
      nombreUsuarioOperador: 'Admin',
    });

    expect(res.productos_actualizados).toBe(3);
    const updateCall = mockClient.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE Productos p')
    );
    expect(updateCall[0]).toContain('p.activo = true');
  });

  it('ProductoService.actualizarProducto limpia costo_usd al pasar USD -> ARS y permite vaciar marca/modelo', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id_producto: 10,
            nombre: 'Cubierta 29',
            marca: 'Maxxis',
            modelo: 'Ikon',
            tipo_prod: 'repuesto',
            cantidad: 5,
            precio: 60000,
            moneda: 'USD',
            precio_usd: 50,
            costo_usd: 30,
            porcentaje_ganancia: 0.66,
            activo: true,
          },
        ],
      }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({
        rows: [
          {
            id_producto: 10,
            nombre: 'Cubierta 29',
            marca: null,
            modelo: null,
            tipo_prod: 'repuesto',
            cantidad: 5,
            precio: 65000,
            moneda: 'ARS',
            costo_usd: null,
          },
        ],
      }) // UPDATE Productos
      .mockResolvedValueOnce({}) // Bitacora
      .mockResolvedValueOnce({}); // COMMIT

    (pool.query as any).mockResolvedValueOnce({
      rows: [{ id_producto: 10, marca: null, modelo: null, moneda: 'ARS', costo_usd: null }],
    });

    const prod = await ProductoService.actualizarProducto(
      10,
      { moneda: 'ARS', precio: 65000, marca: '', modelo: '' },
      { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin', rolUsuarioOperador: 'ADMIN' }
    );

    expect(prod.moneda).toBe('ARS');
    const updateCall = mockClient.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE Productos')
    );
    expect(updateCall[1][2]).toBeNull(); // marcaFinal = null
    expect(updateCall[1][3]).toBeNull(); // modeloFinal = null
    expect(updateCall[1][12]).toBeNull(); // costoUsdFinal limpiado al pasar a ARS
  });

  it('ProveedorService.eliminarProveedor recalcula al dólar global si tenía cotización propia', async () => {
    (pool.query as any)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ nombre_empresa: 'Shimano Import', cotizacion_dolar: 1400 }] })
      .mockResolvedValueOnce({ rows: [{ pagos_count: 0, pendientes_count: 0 }] })
      .mockResolvedValueOnce({}); // Bitacora

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ valor: '1250' }] }) // cot global
      .mockResolvedValueOnce({}) // UPDATE Productos
      .mockResolvedValueOnce({}) // DELETE Proveedor
      .mockResolvedValueOnce({}); // COMMIT

    const res = await ProveedorService.eliminarProveedor(4, {
      idUsuarioOperador: 1,
      nombreUsuarioOperador: 'Admin',
    });

    expect(res.message).toMatch(/eliminado/i);
    const updateCall = mockClient.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE Productos')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall[1]).toEqual([1250, 4]);
  });

  it('ReparacionService.crearReparacion setea fecha_egreso cuando inicia Entregada y Detalle usa COALESCE', async () => {
    (pool.query as any)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_bicicleta: 1, marca: 'Venzo', modelo: 'Loki' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_usuario: 1, nombre_usuario: 'Admin' }] })
      .mockResolvedValueOnce({ rows: [{ id_reparacion: 20, estado: 'Entregada', fecha_egreso: '2026-11-24' }] })
      .mockResolvedValueOnce({}) // Bitacora
      .mockResolvedValueOnce({ rows: [{ id_reparacion: 20, estado: 'Entregada', fecha_egreso: '2026-11-24' }] }); // resCompleta

    const nueva = await ReparacionService.crearReparacion({
      id_bicicleta: 1,
      id_usuario: 1,
      estado: 'Entregada',
      descripcion: 'Service express finalizado',
      costo_mano_obra: 15000,
    });
    expect(nueva.estado).toBe('Entregada');
    const insertCall = (pool.query as any).mock.calls[2][0];
    expect(insertCall).toContain("CASE WHEN $3 = 'Entregada' THEN CURRENT_DATE ELSE NULL END");

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_reparacion: 20, estado: 'Recibida' }] }) // FOR UPDATE Rep
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_producto: 8, nombre: 'Cadena', cantidad: 4, precio: 10000, activo: true }] }) // FOR UPDATE Prod
      .mockResolvedValueOnce({ rows: [{ id_detalle_rep: 99 }] }) // INSERT detalle
      .mockResolvedValueOnce({}) // UPDATE stock
      .mockResolvedValueOnce({ rows: [{ id_reparacion: 20, costo_total: 10000 }] }) // UPDATE costo_total
      .mockResolvedValueOnce({}) // Kardex
      .mockResolvedValueOnce({}) // Bitacora
      .mockResolvedValueOnce({}); // COMMIT

    await DetalleReparacionService.agregarRepuesto({
      id_reparacion: 20,
      id_producto: 8,
      cantidad: 1,
      idUsuarioOperador: 1,
    });
    const costoSql = mockClient.query.mock.calls[5][0];
    expect(costoSql).toContain('COALESCE(costo_mano_obra, 0)');
  });

  it('PagoProveedorService.obtenerPagos filtra total_monto y crearPago directo usa transacción con nombre_proveedor', async () => {
    (pool.query as any)
      .mockResolvedValueOnce({ rows: [{ id_pago: 3, monto_total: '45000', total_registros: 1 }] })
      .mockResolvedValueOnce({ rows: [{ total_monto: '45000' }] });

    const listRes = await PagoProveedorService.obtenerPagos({ busqueda: 'Peretti', limite: 10, pagina: 1 });
    expect(listRes.total_monto).toBe(45000);
    const totalQueryCall = (pool.query as any).mock.calls[1];
    expect(totalQueryCall[0]).toContain('WHERE');
    expect(totalQueryCall[1]).toEqual(['%Peretti%']);

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // SELECT Proveedor
      .mockResolvedValueOnce({ rows: [{ id_proveedor: 12, nombre_empresa: 'Prov Nuevo' }] }) // INSERT Proveedor
      .mockResolvedValueOnce({ rows: [{ id_pago: 50, monto_total: 10000 }] }) // INSERT Pago
      .mockResolvedValueOnce({}) // Bitacora
      .mockResolvedValueOnce({}); // COMMIT

    const pago = await PagoProveedorService.crearPago({
      nombre_proveedor: 'Prov Nuevo',
      id_metodo_pago: 1,
      monto_total: 10000,
      idUsuarioOperador: 1,
    });
    expect(pago.id_pago).toBe(50);
    expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');
    expect(mockClient.query.mock.calls[mockClient.query.mock.calls.length - 1][0]).toBe('COMMIT');
  });

  it('VentaService.obtenerGarantiasBicicletas devuelve total y resumen globales sobre CTE paginado', async () => {
    (pool.query as any).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id_detalle_venta: 1,
          id_venta: 100,
          estado_garantia: 'vigente',
          total_registros: 29,
          res_vigentes: 12,
          res_service_pendiente: 8,
          res_por_vencer: 3,
          res_concluidas: 9,
        },
      ],
    });

    const res = await VentaService.obtenerGarantiasBicicletas(undefined, { limite: 1, pagina: 1 });
    expect(res.total).toBe(29);
    expect(res.resumen).toEqual({
      total: 29,
      vigentes: 12,
      service_pendiente: 8,
      por_vencer: 3,
      concluidas: 9,
    });
    expect(res.garantias[0]).not.toHaveProperty('total_registros');
  });
});
