import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VentaService } from '../src/services/venta.service.js';
import { ReparacionService } from '../src/services/reparacion.service.js';
import { ProductoMasivoService } from '../src/services/productoMasivo.service.js';
import { PagoProveedorService } from '../src/services/pagoProveedor.service.js';
import { pool } from '../src/config/db.js';
import { BadRequestError } from '../src/utils/errors.js';

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('../src/config/db.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(() => Promise.resolve(mockClient)),
    on: vi.fn(),
  },
}));

describe('Regresiones Tanda 2 — Integridad de Dinero, Stock y Transacciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.connect as any).mockResolvedValue(mockClient);
    (pool.query as any).mockReset();
  });

  describe('C12: Inmutabilidad de órdenes de taller Entregadas', () => {
    it('rechaza modificar una orden ya Entregada incluso enviando estado: Entregada', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id_reparacion: 10, estado: 'Entregada', costo_mano_obra: 5000 }],
        }); // SELECT FOR UPDATE

      await expect(
        ReparacionService.actualizarEstadoReparacion(10, {
          estado: 'Entregada',
          costo_mano_obra: 0,
          descripcion: 'Alteración indebida',
          idUsuarioOperador: 2,
          nombreUsuarioOperador: 'Empleado',
        })
      ).rejects.toThrow(/ya han sido entregadas y cerradas/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('C13 / A7 / A8 / A9 / C1: Ventas y Primer Service', () => {
    it('rechaza fecha de calendario inválida (2026-02-31) en registrarPrimerService', async () => {
      await expect(
        VentaService.registrarPrimerService(1, {
          fecha_service: '2026-02-31',
          idUsuarioOperador: 1,
          rolUsuarioOperador: 'ADMIN',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('bloquea a EMPLEADO si la venta ya superó los 30 días aunque envíe fecha_service retroactiva', async () => {
      const hace45Dias = new Date();
      hace45Dias.setDate(hace45Dias.getDate() - 45);
      const yyyy = hace45Dias.getFullYear();
      const mm = String(hace45Dias.getMonth() + 1).padStart(2, '0');
      const dd = String(hace45Dias.getDate()).padStart(2, '0');
      const fechaVentaStr = `${yyyy}-${mm}-${dd}`;

      const hace10DiasDeVenta = new Date(hace45Dias);
      hace10DiasDeVenta.setDate(hace10DiasDeVenta.getDate() + 10);
      const fechaSrvRetro = `${hace10DiasDeVenta.getFullYear()}-${String(hace10DiasDeVenta.getMonth() + 1).padStart(2, '0')}-${String(hace10DiasDeVenta.getDate()).padStart(2, '0')}`;

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{
            id_detalle_venta: 5,
            id_venta: 20,
            id_producto: 3,
            primer_service_realizado: false,
            fecha_venta: fechaVentaStr,
            estado_venta: 'COMPLETADA',
            tipo_prod: 'bicicleta',
            producto_nombre: 'Venzo Primal',
          }],
        });

      await expect(
        VentaService.registrarPrimerService(5, {
          fecha_service: fechaSrvRetro,
          idUsuarioOperador: 2,
          rolUsuarioOperador: 'EMPLEADO',
          nombreUsuarioOperador: 'Empleado',
        })
      ).rejects.toThrow(/requiere autorización de un Administrador/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('trunca marca > 50 caracteres al registrar bicicleta en crearVenta y hace ROLLBACK si falla bitácora (C1/A7)', async () => {
      const nombreLargo = 'B'.repeat(80);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_venta: 77 }] }) // INSERT Venta
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id_producto: 4, nombre: nombreLargo, marca: null, modelo: null, tipo_prod: 'bicicleta', cantidad: 5, precio: 100000, activo: true }],
        }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ id_detalle_venta: 1, costo_total: 100000 }] }) // INSERT Detalle
        .mockResolvedValueOnce({}) // UPDATE Stock
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({}) // INSERT Bicicleta
        .mockResolvedValueOnce({ rows: [{ id_venta: 77, costo_total: 100000 }] }) // UPDATE Total
        .mockRejectedValueOnce(new Error('Fallo bitácora')); // INSERT Bitacora falla

      await expect(
        VentaService.crearVenta({
          id_cliente: 3,
          detalles: [{ id_producto: 4, cantidad: 1 }],
          idUsuarioOperador: 1,
          nombreUsuarioOperador: 'Admin',
        })
      ).rejects.toThrow('Fallo bitácora');

      const biciCall = mockClient.query.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO Bicicleta')
      );
      expect(biciCall).toBeDefined();
      expect(biciCall![1][1]).toHaveLength(50);
      expect(biciCall![1][3]).toBe(77); // id_venta_origen
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
    });

    it('obtenerVentaPorId incluye motivo_anulacion y fecha_anulacion en la consulta SQL (A8)', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{
            id_venta: 12,
            estado: 'ANULADA',
            motivo_anulacion: 'Error de carga',
            fecha_anulacion: '2026-11-20T12:00:00Z',
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const res = await VentaService.obtenerVentaPorId(12);
      const sqlVenta = (pool.query as any).mock.calls[0][0];
      expect(sqlVenta).toContain('v.motivo_anulacion');
      expect(sqlVenta).toContain('v.fecha_anulacion');
      expect(res.venta.motivo_anulacion).toBe('Error de carga');
    });
  });

  describe('C3 / C4 / C5 / A5: Carga Masiva y Aumento Masivo', () => {
    it('normaliza porcentaje_ganancia = 50 a 0.50 y no pisa costo_usd: null con 0 (C3)', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ valor: '1200' }] }) // cotización global
        .mockResolvedValueOnce({ rows: [] }); // catálogo

      const preview = await ProductoMasivoService.previsualizarCargaMasiva({
        moneda_lote: 'USD',
        items: [
          {
            codigo: 'SKU-1',
            nombre: 'Horquilla Suntour',
            tipo_prod: 'repuesto',
            cantidad: 2,
            costo_usd: 100,
            porcentaje_ganancia: 50,
            moneda: 'USD',
          },
          {
            codigo: 'SKU-2',
            nombre: 'Asiento Gel',
            tipo_prod: 'repuesto',
            cantidad: 1,
            costo_usd: null as any,
            porcentaje_ganancia: null as any,
            precio: 15000,
            moneda: 'ARS',
          },
        ],
      });

      expect(preview.items[0]!.porcentaje_ganancia).toBe(0.5);
      expect(preview.items[0]!.precio_usd).toBe(150);
      expect(preview.items[0]!.precio_ars).toBe(180000);
      expect(preview.items[1]!.costo_usd).toBeNull();
      expect(preview.items[1]!.porcentaje_ganancia).toBeNull();
    });

    it('usa cotización propia del proveedor en carga masiva de proveedor único (C5)', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ valor: '1200' }] }) // global
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 9, nombre_empresa: 'Nagel', cotizacion_dolar: '1400.00' }] })
        .mockResolvedValueOnce({ rows: [] });

      const preview = await ProductoMasivoService.previsualizarCargaMasiva({
        id_proveedor: 9,
        moneda_lote: 'USD',
        items: [
          {
            codigo: 'NGL-1',
            nombre: 'Cubierta 29',
            tipo_prod: 'repuesto',
            cantidad: 4,
            precio_usd: 10,
            moneda: 'USD',
          },
        ],
      });

      expect(preview.items[0]!.cotizacion_aplicada).toBe(1400);
      expect(preview.items[0]!.precio_ars).toBe(14000);
    });

    it('consolida filas duplicadas del mismo SKU existente dentro de un mismo lote (C4)', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ valor: '1000' }] })
        .mockResolvedValueOnce({
          rows: [{
            id_producto: 50,
            codigo: 'CAD-1',
            nombre: 'Cadena KMC',
            marca: 'KMC',
            modelo: null,
            tipo_prod: 'repuesto',
            cantidad: 10,
            precio: '5000',
            moneda: 'ARS',
            precio_usd: null,
          }],
        });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ valor: '1000' }] }) // cotizacion
        .mockResolvedValueOnce({ rows: [{ id_producto: 50, cantidad: 10 }] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE Productos
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({}); // COMMIT

      const res = await ProductoMasivoService.ejecutarCargaMasiva(
        {
          moneda_lote: 'ARS',
          modo_stock_default: 'sumar',
          items: [
            { codigo: 'CAD-1', nombre: 'Cadena KMC', tipo_prod: 'repuesto', cantidad: 5, precio: 5000 },
            { codigo: 'CAD-1', nombre: 'Cadena KMC', tipo_prod: 'repuesto', cantidad: 3, precio: 5200 },
          ],
        },
        { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
      );

      expect(res.actualizados).toBe(1);
      expect(res.unidades_ingresadas).toBe(8);
      const updateCall = mockClient.query.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE Productos AS p')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![1][0]).toEqual([50]); // 1 solo ID único
      expect(updateCall![1][6]).toEqual([18]); // 10 + 5 + 3 = 18
    });

    it('rechaza aumento por monto_fijo cuando el filtro mezcla productos ARS y USD (A5)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 3, nombre_empresa: 'Shimano', cotizacion_dolar: null }] })
        .mockResolvedValueOnce({ rows: [{ valor: '1200' }] })
        .mockResolvedValueOnce({
          rows: [
            { id_producto: 1, nombre: 'Prod USD', moneda: 'USD', precio_usd: '10', precio: '12000' },
            { id_producto: 2, nombre: 'Prod ARS', moneda: 'ARS', precio_usd: null, precio: '5000' },
          ],
        });

      await expect(
        ProductoMasivoService.aumentoMasivoPorProveedor(
          { id_proveedor: 3, tipo_ajuste: 'monto_fijo', valor: 1000, preview: false },
          { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
        )
      ).rejects.toThrow(/única moneda/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('C6 / A10: Pagos a Proveedores y Abonos Pendientes', () => {
    it('usa cotización propia del proveedor en abonos USD y rechaza sobrepago incluso de $0,01', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{
            id_pendiente: 8,
            id_proveedor: 4,
            proveedor_nombre: 'Peretti',
            proveedor_cotizacion_dolar: '1500.00',
            saldo_pendiente: '100.00',
            monto_pagado: '0.00',
            moneda: 'USD',
            estado: 'PENDIENTE',
            numero_factura: 'A-100',
          }],
        });

      await expect(
        PagoProveedorService.registrarAbonoPendiente(8, {
          id_metodo_pago: 1,
          monto_abono: 100.01,
          idUsuarioOperador: 1,
          nombreUsuarioOperador: 'Admin',
        })
      ).rejects.toThrow(/supera el saldo pendiente/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('liquida abono USD usando cotizacion_dolar propia del proveedor cuando no se envía manual', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{
            id_pendiente: 8,
            id_proveedor: 4,
            proveedor_nombre: 'Peretti',
            proveedor_cotizacion_dolar: '1500.00',
            saldo_pendiente: '100.00',
            monto_pagado: '0.00',
            moneda: 'USD',
            estado: 'PENDIENTE',
            numero_factura: 'A-100',
          }],
        }) // SELECT Pendiente
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ nombre_empresa: 'Peretti', cotizacion_dolar: '1500.00' }],
        }) // crearPago SELECT Proveedor
        .mockResolvedValueOnce({
          rows: [{ id_pago: 90, monto_total: 150000 }],
        }) // INSERT Pago_Proveedor
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({
          rows: [{ id_pendiente: 8, saldo_pendiente: 0, estado: 'PAGADO', fecha_proximo_pago: '2026-12-01' }],
        }) // UPDATE Pago_Proveedor_Pendiente
        .mockResolvedValueOnce({}); // COMMIT

      const res = await PagoProveedorService.registrarAbonoPendiente(8, {
        id_metodo_pago: 1,
        monto_abono: 100,
        idUsuarioOperador: 1,
        nombreUsuarioOperador: 'Admin',
      });

      expect(res.pendiente.estado).toBe('PAGADO');
      const insertPagoCall = mockClient.query.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO Pago_Proveedor')
      );
      expect(insertPagoCall).toBeDefined();
      expect(insertPagoCall![1][3]).toBe(150000); // 100 USD * 1500 ARS
      expect(insertPagoCall![1][6]).toBe(1500);
    });

    it('rechaza fechas de calendario inexistentes (2026-02-31) en crearPagoPendiente', async () => {
      await expect(
        PagoProveedorService.crearPagoPendiente({
          id_proveedor: 1,
          monto_factura_total: 1000,
          saldo_pendiente: 500,
          fecha_proximo_pago: '2026-02-31',
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/fecha válida/i);
    });
  });
});
