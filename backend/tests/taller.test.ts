import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DetalleReparacionService } from '../src/services/detalleReparacion.service.js';
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

describe('Módulo de Taller y Consumo de Repuestos (DetalleReparacionService)', () => {
  let mockClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClient = await pool.connect();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.query as any).mockReset();
  });

  describe('Asignar Repuesto a Reparación (DetalleReparacionService.agregarRepuesto)', () => {
    it('debe rechazar si falta el operador (401 Unauthorized)', async () => {
      await expect(
        DetalleReparacionService.agregarRepuesto({
          id_reparacion: 1,
          id_producto: 10,
          cantidad: 1,
          precio_unitario: 500,
          idUsuarioOperador: undefined,
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('debe rechazar campos obligatorios faltantes (400 Bad Request)', async () => {
      await expect(
        DetalleReparacionService.agregarRepuesto({
          id_reparacion: 1,
          id_producto: 10,
          cantidad: 0, // !0 es falsy
          precio_unitario: 500,
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/Completá todos los campos/i);
    });

    it('debe rechazar cantidades negativas o no enteras (400 Bad Request)', async () => {
      await expect(
        DetalleReparacionService.agregarRepuesto({
          id_reparacion: 1,
          id_producto: 10,
          cantidad: -5,
          precio_unitario: 500,
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/La cantidad debe ser al menos 1/i);
    });

    it('debe rechazar si la orden de reparación no existe (404 NotFoundError)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT Reparacion

      await expect(
        DetalleReparacionService.agregarRepuesto({
          id_reparacion: 999,
          id_producto: 10,
          cantidad: 1,
          precio_unitario: 500,
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(NotFoundError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe rechazar agregar repuestos si la orden ya fue entregada', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_reparacion: 5, estado: 'Entregada', costo_mano_obra: 1000 }],
          rowCount: 1,
        }); // SELECT Reparacion

      await expect(
        DetalleReparacionService.agregarRepuesto({
          id_reparacion: 5,
          id_producto: 10,
          cantidad: 1,
          precio_unitario: 500,
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/ya fue entregada/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe rechazar si el producto está inactivo (activo = false)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_reparacion: 5, estado: 'En Proceso', costo_mano_obra: 1000 }],
          rowCount: 1,
        }) // SELECT Reparacion
        .mockResolvedValueOnce({
          rows: [{ id_producto: 12, nombre: 'Cadena Vieja', precio: 800, cantidad: 5, activo: false, tipo_prod: 'repuesto' }],
          rowCount: 1,
        }); // SELECT Productos

      await expect(
        DetalleReparacionService.agregarRepuesto({
          id_reparacion: 5,
          id_producto: 12,
          cantidad: 1,
          precio_unitario: 800,
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/dado de baja en el inventario/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe bloquear la asignación de bicicletas completas como repuestos de taller', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_reparacion: 5, estado: 'En Proceso', costo_mano_obra: 1000 }],
          rowCount: 1,
        }) // SELECT Reparacion
        .mockResolvedValueOnce({
          rows: [{ id_producto: 3, nombre: 'Bicicleta SLP 50 Pro', precio: 95000, cantidad: 2, activo: true, tipo_prod: 'bicicleta' }],
          rowCount: 1,
        }); // SELECT Productos

      await expect(
        DetalleReparacionService.agregarRepuesto({
          id_reparacion: 5,
          id_producto: 3,
          cantidad: 1,
          precio_unitario: 95000,
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/es una bicicleta completa y no puede asignarse como repuesto/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe rechazar si no hay suficiente stock en inventario', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_reparacion: 5, estado: 'En Proceso', costo_mano_obra: 1000 }],
          rowCount: 1,
        }) // SELECT Reparacion
        .mockResolvedValueOnce({
          rows: [{ id_producto: 7, nombre: 'Pastillas de Freno Shimano', precio: 1200, cantidad: 1, activo: true, tipo_prod: 'repuesto' }],
          rowCount: 1,
        }); // SELECT Productos (hay 1, se piden 2)

      await expect(
        DetalleReparacionService.agregarRepuesto({
          id_reparacion: 5,
          id_producto: 7,
          cantidad: 2,
          precio_unitario: 1200,
          idUsuarioOperador: 1,
        })
      ).rejects.toThrow(/No hay suficiente stock/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe descontar stock, registrar Kardex y actualizar costo de la orden exitosamente', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_reparacion: 8, estado: 'En Proceso', costo_mano_obra: 2500 }],
          rowCount: 1,
        }) // SELECT Reparacion
        .mockResolvedValueOnce({
          rows: [{ id_producto: 15, nombre: 'Cable de Freno', precio: 400, cantidad: 10, activo: true, tipo_prod: 'repuesto' }],
          rowCount: 1,
        }) // SELECT Productos
        .mockResolvedValueOnce({
          rows: [{ id_detalle_rep: 1, id_reparacion: 8, id_producto: 15, cantidad: 2, precio_unitario: 400, costo_total: 800 }],
          rowCount: 1,
        }) // INSERT Detalle_Reparacion
        .mockResolvedValueOnce({}) // UPDATE Productos (-2 stock)
        .mockResolvedValueOnce({
          rows: [{ id_reparacion: 8, costo_mano_obra: 2500, costo_total: 3300 }],
          rowCount: 1,
        }) // UPDATE Reparacion costo_total
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({}); // COMMIT

      const resultado = await DetalleReparacionService.agregarRepuesto({
        id_reparacion: 8,
        id_producto: 15,
        cantidad: 2,
        precio_unitario: 400,
        idUsuarioOperador: 4,
        nombreUsuarioOperador: 'Mecánico Juan',
      });

      expect(resultado.detalle.costo_total).toBe(800);
      expect(resultado.reparacion.costo_total).toBe(3300);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verificar descuento de stock en productos
      const stockCall = mockClient.query.mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('UPDATE Productos \n        SET cantidad = cantidad - $1')
      );
      expect(stockCall).toBeDefined();
      expect(stockCall[1]).toEqual([2, 15]);

      // Verificar registro en Movimiento_Stock con tipo EGRESO y motivo Uso Interno de Taller
      const movCall = mockClient.query.mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO Movimiento_Stock')
      );
      expect(movCall).toBeDefined();
      expect(movCall[0]).toContain("'EGRESO'");
      expect(movCall[1][0]).toBe(15); // id_producto
      expect(movCall[1][1]).toBe(4); // id_usuario
      expect(movCall[1][2]).toBe(2); // cantidad
    });
  });

  describe('Eliminar Repuesto de Reparación (DetalleReparacionService.eliminarRepuesto)', () => {
    it('debe rechazar si falta el operador', async () => {
      await expect(
        DetalleReparacionService.eliminarRepuesto(1, { idUsuarioOperador: undefined })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('debe rechazar si el detalle no existe en la orden (404)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT Detalle

      await expect(
        DetalleReparacionService.eliminarRepuesto(99, { idUsuarioOperador: 1 })
      ).rejects.toThrow(NotFoundError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe rechazar si la orden asociada ya fue entregada', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_detalle_rep: 2, id_reparacion: 10, id_producto: 5, cantidad: 1, producto_nombre: 'Freno' }],
          rowCount: 1,
        }) // SELECT Detalle
        .mockResolvedValueOnce({
          rows: [{ estado: 'Entregada' }],
          rowCount: 1,
        }); // SELECT Reparacion

      await expect(
        DetalleReparacionService.eliminarRepuesto(2, { idUsuarioOperador: 1 })
      ).rejects.toThrow(/ya fue entregada/i);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('debe reintegrar stock al inventario y registrar Kardex de tipo INGRESO al eliminar repuesto', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id_detalle_rep: 10, id_reparacion: 12, id_producto: 20, cantidad: 3, producto_nombre: 'Rayos reforzados' }],
          rowCount: 1,
        }) // SELECT Detalle
        .mockResolvedValueOnce({
          rows: [{ estado: 'En Proceso' }],
          rowCount: 1,
        }) // SELECT Reparacion
        .mockResolvedValueOnce({}) // DELETE Detalle_Reparacion
        .mockResolvedValueOnce({}) // UPDATE Productos (+3 stock devuelto)
        .mockResolvedValueOnce({
          rows: [{ id_reparacion: 12, costo_total: 4000 }],
          rowCount: 1,
        }) // UPDATE Reparacion costo_total
        .mockResolvedValueOnce({}) // INSERT Movimiento_Stock
        .mockResolvedValueOnce({}) // INSERT Bitacora
        .mockResolvedValueOnce({}); // COMMIT

      const respuesta = await DetalleReparacionService.eliminarRepuesto(10, {
        idUsuarioOperador: 2,
        nombreUsuarioOperador: 'Mecánico Pedro',
      });

      expect(respuesta.message).toMatch(/reintegrado al inventario con éxito/i);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verificar actualización de stock +3
      const stockDevueltoCall = mockClient.query.mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('UPDATE Productos \n        SET cantidad = cantidad + $1')
      );
      expect(stockDevueltoCall).toBeDefined();
      expect(stockDevueltoCall[1]).toEqual([3, 20]);

      // Verificar Kardex INGRESO
      const kardexDevolucion = mockClient.query.mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO Movimiento_Stock')
      );
      expect(kardexDevolucion).toBeDefined();
      expect(kardexDevolucion[0]).toContain("'INGRESO'");
      expect(kardexDevolucion[1][0]).toBe(20); // id_producto
      expect(kardexDevolucion[1][1]).toBe(2); // id_usuario
      expect(kardexDevolucion[1][2]).toBe(3); // cantidad
    });
  });
});
