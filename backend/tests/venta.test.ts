import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VentaService } from '../src/services/venta.service.js';
import { pool } from '../src/config/db.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../src/utils/errors.js';

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

describe('Módulo de Ventas y Transaccionalidad de Stock (VentaService)', () => {
  let mockClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClient = await pool.connect();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.query as any).mockReset();
  });

  describe('Creación de Venta (VentaService.crearVenta)', () => {
    it('debe requerir autenticación del operador (401 Unauthorized)', async () => {
      await expect(
        VentaService.crearVenta({
          id_cliente: 1,
          detalles: [{ id_producto: 1, cantidad: 1 }],
          idUsuarioOperador: undefined,
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('debe rechazar ventas sin cliente o con cliente inválido (400 Bad Request)', async () => {
      await expect(
        VentaService.crearVenta({
          id_cliente: 0,
          detalles: [{ id_producto: 1, cantidad: 1 }],
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/Seleccioná un cliente/i);
    });

    it('debe rechazar ventas con lista vacía de artículos', async () => {
      await expect(
        VentaService.crearVenta({
          id_cliente: 1,
          detalles: [],
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/Agregá al menos un artículo/i);
    });

    it('debe rechazar cantidades no enteras o menores a 1', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id_venta: 10 }] }); // INSERT Venta

      await expect(
        VentaService.crearVenta({
          id_cliente: 1,
          detalles: [{ id_producto: 1, cantidad: 0 }],
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/La cantidad debe ser al menos 1/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe rechazar la venta si el artículo está dado de baja (activo = false)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_venta: 10 }] }) // INSERT Venta
        .mockResolvedValueOnce({
          rows: [{ id_producto: 5, nombre: 'Casco Vintage', cantidad: 10, precio: 2000, activo: false, tipo_prod: 'accesorio' }],
          rowCount: 1,
        }); // SELECT FOR UPDATE

      await expect(
        VentaService.crearVenta({
          id_cliente: 1,
          detalles: [{ id_producto: 5, cantidad: 1 }],
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/dado de baja y no se puede comercializar/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe rechazar la venta y hacer ROLLBACK si no hay suficiente stock', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_venta: 10 }] }) // INSERT Venta
        .mockResolvedValueOnce({
          rows: [{ id_producto: 1, nombre: 'Cámara 29', cantidad: 2, precio: 1500, activo: true, tipo_prod: 'repuesto' }],
          rowCount: 1,
        }); // SELECT FOR UPDATE (hay 2, se piden 3)

      await expect(
        VentaService.crearVenta({
          id_cliente: 1,
          detalles: [{ id_producto: 1, cantidad: 3 }],
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/No hay suficiente stock de "Cámara 29". Hay 2, pediste 3/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('debe ordenar los artículos por ID para evitar deadlocks en bloqueos FOR UPDATE', async () => {
      // Pasamos artículos en orden inverso (ID 10 y luego ID 2)
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_venta: 15 }] }) // INSERT Venta
        // Primer artículo procesado debe ser el ID 2
        .mockResolvedValueOnce({
          rows: [{ id_producto: 2, nombre: 'Grip', cantidad: 10, precio: 500, activo: true, tipo_prod: 'accesorio' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ id_detalle_venta: 1, costo_total: 500 }] }) // INSERT Detalle
        .mockResolvedValueOnce({}) // UPDATE Stock prod 2
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock prod 2
        // Segundo artículo procesado debe ser el ID 10
        .mockResolvedValueOnce({
          rows: [{ id_producto: 10, nombre: 'Pedales', cantidad: 10, precio: 1200, activo: true, tipo_prod: 'repuesto' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ id_detalle_venta: 2, costo_total: 1200 }] }) // INSERT Detalle
        .mockResolvedValueOnce({}) // UPDATE Stock prod 10
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock prod 10
        .mockResolvedValueOnce({ rows: [{ id_venta: 15, costo_total: 1700 }] }) // UPDATE Total Venta
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({}); // COMMIT

      await VentaService.crearVenta({
        id_cliente: 2,
        detalles: [
          { id_producto: 10, cantidad: 1 },
          { id_producto: 2, cantidad: 1 },
        ],
        idUsuarioOperador: 1,
      });

      // Verificar que la primera consulta FOR UPDATE se hizo con el id_producto = 2
      const queriesForUpdate = mockClient.query.mock.calls.filter((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('FOR UPDATE')
      );
      expect(queriesForUpdate.length).toBe(2);
      expect(queriesForUpdate[0][1]).toEqual([2]);
      expect(queriesForUpdate[1][1]).toEqual([10]);
    });

    it('debe registrar el egreso en Movimiento_Stock y la bicicleta en el cliente si se vende una bicicleta', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_venta: 20 }] }) // INSERT Venta
        .mockResolvedValueOnce({
          rows: [{ id_producto: 8, nombre: 'Venzo Raptor Rodado 29', marca: 'Venzo', modelo: 'Raptor', cantidad: 3, precio: 120000, activo: true, tipo_prod: 'bicicleta' }],
          rowCount: 1,
        }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ id_detalle_venta: 1, costo_total: 120000 }] }) // INSERT Detalle
        .mockResolvedValueOnce({}) // UPDATE Stock (descuenta 1)
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({}) // INSERT Bicicleta cliente
        .mockResolvedValueOnce({ rows: [{ id_venta: 20, costo_total: 120000 }] }) // UPDATE Total Venta
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({}); // COMMIT

      const respuesta = await VentaService.crearVenta({
        id_cliente: 5,
        detalles: [{ id_producto: 8, cantidad: 1 }],
        idUsuarioOperador: 3,
        nombreUsuarioOperador: 'Carlos Vendedor',
      });

      expect(respuesta.venta.id_venta).toBe(20);
      expect(respuesta.venta.costo_total).toBe(120000);

      // Verificar registro en Movimiento_Stock
      const movCall = mockClient.query.mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO Movimiento_Stock')
      );
      expect(movCall).toBeDefined();
      expect(movCall[0]).toContain("'EGRESO'");
      expect(movCall[1][0]).toBe(8); // id_producto
      expect(movCall[1][1]).toBe(3); // id_usuario
      expect(movCall[1][2]).toBe(1); // cantidad

      // Verificar que se insertó la bicicleta en la cuenta del cliente
      const biciCall = mockClient.query.mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO Bicicleta')
      );
      expect(biciCall).toBeDefined();
      expect(biciCall[1][0]).toBe(5); // id_cliente
      expect(biciCall[1][1]).toBe('Venzo'); // marca
    });
  });

  describe('Anulación de Venta (VentaService.anularVenta)', () => {
    it('debe rechazar la anulación si no se especifica un motivo de al menos 5 caracteres', async () => {
      await expect(
        VentaService.anularVenta(1, 'no', { idUsuarioOperador: 1 })
      ).rejects.toThrow(/mínimo 5 caracteres/i);
    });

    it('debe rechazar la anulación si la venta ya está anulada', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_venta: 30, estado: 'ANULADA' }],
          rowCount: 1,
        }); // SELECT FOR UPDATE

      await expect(
        VentaService.anularVenta(30, 'Cliente devolvió el producto', { idUsuarioOperador: 1 })
      ).rejects.toThrow(/ya se encuentra anulada/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe devolver el stock y registrar Movimiento_Stock de tipo INGRESO al anular', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_venta: 40, estado: 'Completada', id_cliente: 7 }],
          rowCount: 1,
        }) // SELECT Venta
        .mockResolvedValueOnce({
          rows: [{ id_producto: 15, cantidad: 2, tipo_prod: 'repuesto', nombre: 'Cadena KMC' }],
          rowCount: 1,
        }) // SELECT Detalle_Venta
        .mockResolvedValueOnce({}) // UPDATE Productos (+2 stock)
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock (+2 INGRESO)
        .mockResolvedValueOnce({ rows: [{ id_venta: 40, estado: 'ANULADA' }] }) // UPDATE Venta estado = ANULADA
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({}); // COMMIT

      const res = await VentaService.anularVenta(40, 'Error de cobro duplicado', {
        idUsuarioOperador: 1,
        nombreUsuarioOperador: 'Admin',
      });

      expect(res.message).toMatch(/anulada y stock reintegrado/i);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verificar actualización de stock +2
      const updateStockCall = mockClient.query.mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('UPDATE Productos SET cantidad = cantidad + $1')
      );
      expect(updateStockCall).toBeDefined();
      expect(updateStockCall[1]).toEqual([2, 15]);

      // Verificar inserción en Kardex con INGRESO
      const kardexCall = mockClient.query.mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO Movimiento_Stock')
      );
      expect(kardexCall[0]).toContain("'INGRESO'");
      expect(kardexCall[1][0]).toBe(15); // id_producto
      expect(kardexCall[1][1]).toBe(1); // id_usuario
      expect(kardexCall[1][2]).toBe(2); // cantidad
    });
  });
});
