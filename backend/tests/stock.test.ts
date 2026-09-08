import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductoService } from '../src/services/producto.service.js';
import { pool } from '../src/config/db.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../src/utils/errors.js';

// Mockeamos la conexión a la base de datos
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

describe('Módulo de Stock e Inventario (ProductoService)', () => {
  let mockClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClient = await pool.connect();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.query as any).mockReset();
  });

  describe('Validación de Parámetros en Creación de Producto', () => {
    it('debe rechazar la creación si el nombre tiene menos de 2 caracteres', async () => {
      await expect(
        ProductoService.crearProducto(
          { nombre: 'A', tipo_prod: 'repuesto', precio: 1000, cantidad: 5 },
          { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('debe rechazar tipos de producto no permitidos', async () => {
      await expect(
        ProductoService.crearProducto(
          { nombre: 'Casco Pro', tipo_prod: 'indumentaria_invalida', precio: 1000, cantidad: 5 },
          { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('debe rechazar precios negativos', async () => {
      await expect(
        ProductoService.crearProducto(
          { nombre: 'Cadena Shimano', tipo_prod: 'repuesto', precio: -50, cantidad: 5 },
          { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('debe rechazar cantidades negativas o no enteras', async () => {
      await expect(
        ProductoService.crearProducto(
          { nombre: 'Cadena Shimano', tipo_prod: 'repuesto', precio: 500, cantidad: 2.5 },
          { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
        )
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('Ajuste de Stock Manual (ProductoService.ajustarStock)', () => {
    it('debe rechazar el ajuste si no se identifica al operador (401 Unauthorized)', async () => {
      await expect(
        ProductoService.ajustarStock(1, {
          cantidad_ajuste: 5,
          tipo_movimiento: 'INGRESO',
          motivo: 'Compra de lote',
          idUsuarioOperador: undefined,
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('debe rechazar si el producto no existe (404 NotFoundError)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT producto

      await expect(
        ProductoService.ajustarStock(999, {
          cantidad_ajuste: 5,
          tipo_movimiento: 'INGRESO',
          motivo: 'Lote de repuestos',
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(NotFoundError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('debe bloquear el ajuste si el producto está inactivo (activo = false)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_producto: 1, nombre: 'Cámara Rodado 26', cantidad: 0, activo: false }],
          rowCount: 1,
        });

      await expect(
        ProductoService.ajustarStock(1, {
          cantidad_ajuste: 10,
          tipo_movimiento: 'INGRESO',
          motivo: 'Reabastecimiento',
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/inactivo/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe ejecutar un INGRESO correctamente y registrar en Movimiento_Stock con motivo truncado', async () => {
      const motivoLargo = 'Ingreso de mercadería por remito oficial #123456789 con detalles muy largos que superan ampliamente los cien caracteres totales permitidos';
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_producto: 1, nombre: 'Cámara Rodado 29', cantidad: 10, activo: true }],
          rowCount: 1,
        }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({
          rows: [{ id_producto: 1, nombre: 'Cámara Rodado 29', cantidad: 15 }],
          rowCount: 1,
        }) // UPDATE Productos
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({}) // INSERT Bitacora_Actividad
        .mockResolvedValueOnce({}); // COMMIT

      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id_producto: 1, nombre: 'Cámara Rodado 29', cantidad: 15, estado_stock: 'optimo' }],
        rowCount: 1,
      });

      const resultado = await ProductoService.ajustarStock(1, {
        cantidad_ajuste: 5,
        tipo_movimiento: 'INGRESO',
        motivo: motivoLargo,
        idUsuarioOperador: 2,
        nombreUsuarioOperador: 'Empleado Juan',
      });

      expect(resultado.nuevo_stock).toBe(15);
      expect(resultado.stock_anterior).toBe(10);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verificar que el motivo en Movimiento_Stock no excedió los 100 caracteres
      const llamadaMovimiento = mockClient.query.mock.calls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO Movimiento_Stock')
      );
      expect(llamadaMovimiento).toBeDefined();
      const paramsMovimiento = llamadaMovimiento[1];
      expect(paramsMovimiento[4].length).toBeLessThanOrEqual(100);
      expect(paramsMovimiento[2]).toBe('INGRESO');
      expect(paramsMovimiento[3]).toBe(5);
    });

    it('debe rechazar un EGRESO si el stock actual es menor a la cantidad solicitada', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_producto: 2, nombre: 'Cubierta Maxxis', cantidad: 3, activo: true }],
          rowCount: 1,
        });

      await expect(
        ProductoService.ajustarStock(2, {
          cantidad_ajuste: 5,
          tipo_movimiento: 'EGRESO',
          motivo: 'Rotura de stock',
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/No hay suficiente stock/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe permitir un AJUSTE directo a 0 unidades y registrar el egreso correspondiente', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_producto: 3, nombre: 'Luz Delantera', cantidad: 4, activo: true }],
          rowCount: 1,
        }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({
          rows: [{ id_producto: 3, nombre: 'Luz Delantera', cantidad: 0 }],
          rowCount: 1,
        }) // UPDATE Productos cantidad = 0
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({}); // COMMIT

      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id_producto: 3, nombre: 'Luz Delantera', cantidad: 0, estado_stock: 'sin_stock' }],
        rowCount: 1,
      });

      const res = await ProductoService.ajustarStock(3, {
        cantidad_ajuste: 0,
        tipo_movimiento: 'AJUSTE',
        motivo: 'Conteo físico fin de mes',
        idUsuarioOperador: 1,
      });

      expect(res.nuevo_stock).toBe(0);
      expect(res.stock_anterior).toBe(4);

      // Verificar que se registró EGRESO de 4 unidades en Kardex
      const llamadaMov = mockClient.query.mock.calls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO Movimiento_Stock')
      );
      expect(llamadaMov).toBeDefined();
      expect(llamadaMov[1][2]).toBe('EGRESO');
      expect(llamadaMov[1][3]).toBe(4);
    });

    it('debe realizar ROLLBACK y liberar el cliente si la base de datos lanza un error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Fallo de conexión en DB')); // Error inesperado

      await expect(
        ProductoService.ajustarStock(1, {
          cantidad_ajuste: 2,
          tipo_movimiento: 'INGRESO',
          motivo: 'Reposición',
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow('Fallo de conexión en DB');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });
});
