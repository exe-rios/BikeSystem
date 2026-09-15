import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductoService, parsearBusquedaAvanzada } from '../src/services/producto.service.js';
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

    it('debe rechazar la creación de una bicicleta si no se especifica el género', async () => {
      await expect(
        ProductoService.crearProducto(
          { nombre: 'Mountain Bike X', tipo_prod: 'bicicleta', precio: 150000, cantidad: 1 },
          { idUsuarioOperador: 1, nombreUsuarioOperador: 'Admin' }
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('debe rechazar la creación de una bicicleta con género inválido', async () => {
      await expect(
        ProductoService.crearProducto(
          { nombre: 'Mountain Bike X', tipo_prod: 'bicicleta', precio: 150000, cantidad: 1, genero: 'genero_desconocido' },
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

  describe('Lógica de Alertas de Stock Bajo Personalizadas', () => {
    it('debe filtrar productos en bajo_stock usando estrictamente su stock_minimo personalizado', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({
          rows: [{ total_articulos: 2, total_unidades: 6, bajo_stock_count: 1, inactivos_count: 0 }],
        })
        .mockResolvedValueOnce({
          rows: [
            { id_producto: 1, nombre: 'Bici Premium', cantidad: 2, stock_minimo: 1, estado_stock: 'optimo' },
            { id_producto: 2, nombre: 'Cadena KMC', cantidad: 4, stock_minimo: 5, estado_stock: 'bajo_stock' },
          ],
        });

      const res = await ProductoService.obtenerProductos({});
      expect(res.productos).toHaveLength(2);
      expect(res.productos[0].estado_stock).toBe('optimo');
      expect(res.productos[1].estado_stock).toBe('bajo_stock');
      expect(res.resumen.bajo_stock_count).toBe(1);
    });

    it('debe construir la query de bajo_stock sin el umbral hardcodeado de 5', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [{ total_articulos: 0, total_unidades: 0, bajo_stock_count: 0, inactivos_count: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      await ProductoService.obtenerProductos({ disponibilidad: 'bajo_stock' });
      const sqlQueryEjecutada = (pool.query as any).mock.calls[1][0];

      expect(sqlQueryEjecutada).toContain('stock_minimo > 0 AND p.cantidad <= p.stock_minimo');
      expect(sqlQueryEjecutada).not.toContain('cantidad <= 5');
    });
  });

  describe('Búsqueda Inteligente de Stock por Marca y Talle', () => {
    describe('Parser de Búsqueda Avanzada (parsearBusquedaAvanzada)', () => {
      it('debe reconocer "marca scott talle m" extrayendo talle M y término scott', () => {
        const res = parsearBusquedaAvanzada('marca scott talle m');
        expect(res.talle?.toLowerCase()).toBe('m');
        expect(res.terminos).toEqual(['scott']);
      });

      it('debe reconocer "scott talle m" extrayendo talle M y término scott', () => {
        const res = parsearBusquedaAvanzada('scott talle m');
        expect(res.talle?.toLowerCase()).toBe('m');
        expect(res.terminos).toEqual(['scott']);
      });

      it('debe reconocer "scott m" deduciendo que M es el talle estándar', () => {
        const res = parsearBusquedaAvanzada('scott m');
        expect(res.talle?.toLowerCase()).toBe('m');
        expect(res.terminos).toEqual(['scott']);
      });

      it('debe reconocer rodado y talle en "marca venzo rodado 29 talle s"', () => {
        const res = parsearBusquedaAvanzada('marca venzo rodado 29 talle s');
        expect(res.talle?.toLowerCase()).toBe('s');
        expect(res.rodado).toBe('29');
        expect(res.terminos).toEqual(['venzo']);
      });

      it('debe extraer únicamente talle cuando la consulta es "talle L"', () => {
        const res = parsearBusquedaAvanzada('talle L');
        expect(res.talle).toBe('L');
        expect(res.terminos).toEqual([]);
      });

      it('debe procesar consultas genéricas como "cadena shimano" sin asignar talle erróneo', () => {
        const res = parsearBusquedaAvanzada('cadena shimano');
        expect(res.talle).toBeUndefined();
        expect(res.terminos).toEqual(['cadena', 'shimano']);
      });
    });

    describe('Construcción de Consulta SQL en ProductoService.obtenerProductos', () => {
      it('debe generar SQL con filtro de talle y marca al buscar "marca scott talle m"', async () => {
        (pool.query as any)
          .mockResolvedValueOnce({ rows: [{ total_articulos: 1, total_unidades: 5, bajo_stock_count: 0, inactivos_count: 0 }] })
          .mockResolvedValueOnce({
            rows: [
              {
                id_producto: 10,
                nombre: 'Scott Aspect 950',
                marca: 'Scott',
                talle: 'M',
                rodado: '29',
                cantidad: 5,
                estado_stock: 'optimo',
                tipo_prod: 'bicicleta'
              }
            ]
          });

        const resultado = await ProductoService.obtenerProductos({ busqueda: 'marca scott talle m' });
        const sqlEjecutada = (pool.query as any).mock.calls[1][0];
        const paramsEjecutados = (pool.query as any).mock.calls[1][1];

        // Verifica que la query filtra por pb.talle y por término de marca
        expect(sqlEjecutada).toContain('LOWER(TRIM(COALESCE(pb.talle, \'\')))');
        expect(sqlEjecutada).toContain('pb.marca ILIKE');
        expect(paramsEjecutados).toContain('m');
        expect(paramsEjecutados).toContain('%scott%');

        // Verifica que devuelve el artículo con la cantidad disponible de 5 unidades
        expect(resultado.productos).toHaveLength(1);
        expect(resultado.productos[0].marca).toBe('Scott');
        expect(resultado.productos[0].talle).toBe('M');
        expect(resultado.productos[0].cantidad).toBe(5);
      });

      it('debe admitir talle y marca explícitos pasados como filtros directos', async () => {
        (pool.query as any)
          .mockResolvedValueOnce({ rows: [{ total_articulos: 0, total_unidades: 0, bajo_stock_count: 0, inactivos_count: 0 }] })
          .mockResolvedValueOnce({ rows: [] });

        await ProductoService.obtenerProductos({ talle: 'XL', marca: 'Trek' });
        const sqlEjecutada = (pool.query as any).mock.calls[1][0];
        const paramsEjecutados = (pool.query as any).mock.calls[1][1];

        expect(sqlEjecutada).toContain('LOWER(TRIM(COALESCE(pb.talle, \'\')))');
        expect(sqlEjecutada).toContain('pb.marca ILIKE');
        expect(paramsEjecutados).toContain('XL');
        expect(paramsEjecutados).toContain('%Trek%');
      });
    });
  });
});
