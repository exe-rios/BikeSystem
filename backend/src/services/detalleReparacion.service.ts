import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { validarId } from '../utils/validation.js';

/** Servicio para la imputación y devolución de repuestos en órdenes de reparación. */
export class DetalleReparacionService {
  /** Asigna un repuesto a una orden de taller, descuenta inventario y actualiza costo total. */
  static async agregarRepuesto(datos: {
    id_reparacion: number | string;
    id_producto: number | string;
    cantidad: number | string;
    precio_unitario?: number | string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const { id_reparacion, id_producto, cantidad, precio_unitario, idUsuarioOperador, nombreUsuarioOperador } = datos;

    if (!id_reparacion || !id_producto || !cantidad) {
      throw new BadRequestError('Completá todos los campos: orden, repuesto y cantidad.');
    }

    const idRepNum = validarId(id_reparacion, 'No se encontró esa orden de taller.');
    const idProdNum = validarId(id_producto, 'No se encontró ese repuesto.');
    const cantNum = Number(cantidad);

    if (isNaN(cantNum) || cantNum <= 0 || !Number.isInteger(cantNum)) {
      throw new BadRequestError('La cantidad debe ser al menos 1.');
    }

    if (precio_unitario !== undefined && precio_unitario !== null && precio_unitario !== '') {
      const precioNum = Number(precio_unitario);
      if (isNaN(precioNum) || precioNum < 0) {
        throw new BadRequestError('El precio no puede ser negativo.');
      }
    }

    if (!idUsuarioOperador || isNaN(Number(idUsuarioOperador)) || Number(idUsuarioOperador) <= 0) {
      throw new UnauthorizedError('No se pudo identificar al usuario que asigna el repuesto.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resRep = await client.query('SELECT id_reparacion, estado, costo_mano_obra FROM Reparacion WHERE id_reparacion = $1 FOR UPDATE;', [idRepNum]);
      if (resRep.rowCount === 0) {
        throw new NotFoundError('Esa orden de taller no existe.');
      }

      const rep = resRep.rows[0];
      if (rep.estado === 'Entregada') {
        throw new BadRequestError('No se pueden agregar repuestos a una orden que ya fue entregada.');
      }

      const resProd = await client.query('SELECT id_producto, nombre, precio, cantidad, activo, tipo_prod FROM Productos WHERE id_producto = $1 FOR UPDATE;', [idProdNum]);
      if (resProd.rowCount === 0) {
        throw new NotFoundError('Ese repuesto no existe en el inventario.');
      }

      const producto = resProd.rows[0];
      if (producto.activo === false) {
        throw new BadRequestError(`El repuesto "${producto.nombre}" está dado de baja en el inventario.`);
      }

      if (producto.tipo_prod === 'bicicleta') {
        throw new BadRequestError(`"${producto.nombre}" es una bicicleta completa y no puede asignarse como repuesto de taller.`);
      }

      if (Number(producto.cantidad) < cantNum) {
        throw new BadRequestError(`No hay suficiente stock de "${producto.nombre}". Hay ${producto.cantidad} unidades.`);
      }

      // Blindaje de precio: Precio oficial de catálogo como fuente de la verdad
      const precioOficial = Number(producto.precio) || 0;
      const costo_total_detalle = Math.round(cantNum * precioOficial * 100) / 100;

      const queryInsert = `
        INSERT INTO Detalle_Reparacion (id_reparacion, id_producto, cantidad, precio_unitario, costo_total)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const resultDetalle = await client.query(queryInsert, [idRepNum, idProdNum, cantNum, precioOficial, costo_total_detalle]);

      const queryStock = `
        UPDATE Productos 
        SET cantidad = cantidad - $1 
        WHERE id_producto = $2;
      `;
      await client.query(queryStock, [cantNum, idProdNum]);

      const queryCosto = `
        UPDATE Reparacion 
        SET costo_total = costo_mano_obra + (SELECT COALESCE(SUM(costo_total), 0) FROM Detalle_Reparacion WHERE id_reparacion = $1)
        WHERE id_reparacion = $1
        RETURNING *;
      `;
      const resRepActualizada = await client.query(queryCosto, [idRepNum]);

      // Registro garantizado en Kardex (Movimiento_Stock)
      await client.query(
        `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
         VALUES ($1, $2, 'EGRESO', $3, 'Uso Interno de Taller', $4);`,
        [
          idProdNum,
          idUsuarioOperador,
          cantNum,
          `Consumo en Orden de Taller #${idRepNum}`
        ]
      );

      try {
        await client.query(
          `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
           VALUES ($1, $2, 'Taller', 'Asignación de Repuesto', $3);`,
          [
            idUsuarioOperador || null,
            nombreUsuarioOperador || 'Usuario',
            `${cantNum} un. de "${producto.nombre}" asignado(s) a Orden #${idRepNum}. Subtotal: $${costo_total_detalle}.`
          ]
        );
      } catch {
        // Ignorar
      }

      await client.query('COMMIT');

      return {
        detalle: resultDetalle.rows[0],
        reparacion: resRepActualizada.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Lista todos los repuestos cargados a una orden de taller específica. */
  static async obtenerRepuestosDeReparacion(idReparacion: number) {
    validarId(idReparacion, 'No se encontró esa orden de taller.');

    const query = `
      SELECT dr.*, p.nombre, p.marca, p.tipo_prod, p.precio
      FROM Detalle_Reparacion dr
      INNER JOIN Productos p ON dr.id_producto = p.id_producto
      WHERE dr.id_reparacion = $1
      ORDER BY dr.id_detalle_rep ASC;
    `;
    const result = await pool.query(query, [idReparacion]);

    return {
      total: result.rowCount || 0,
      repuestos: result.rows
    };
  }

  /** Remueve un repuesto de la orden, reintegra stock al inventario y recalcula costos. */
  static async eliminarRepuesto(idDetalleRep: number, operador: {
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    validarId(idDetalleRep, 'No se encontró ese repuesto en la orden.');

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;

    if (!idUsuarioOperador || isNaN(Number(idUsuarioOperador)) || Number(idUsuarioOperador) <= 0) {
      throw new UnauthorizedError('No se pudo identificar al usuario que elimina el repuesto.');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const queryBuscar = `
        SELECT dr.*, p.nombre AS producto_nombre
        FROM Detalle_Reparacion dr
        INNER JOIN Productos p ON dr.id_producto = p.id_producto
        WHERE dr.id_detalle_rep = $1
        FOR UPDATE;
      `;
      const resultBuscar = await client.query(queryBuscar, [idDetalleRep]);

      if (resultBuscar.rowCount === 0) {
        throw new NotFoundError('Ese repuesto no está asignado a esta orden.');
      }

      const detalle = resultBuscar.rows[0];
      const idReparacion = detalle.id_reparacion;
      const idProducto = detalle.id_producto;
      const cantidadDevolver = Number(detalle.cantidad);

      // Verificar que la orden no esté entregada
      const checkRep = await client.query('SELECT estado FROM Reparacion WHERE id_reparacion = $1 FOR UPDATE;', [idReparacion]);
      if (checkRep.rowCount && checkRep.rows[0].estado === 'Entregada') {
        throw new BadRequestError('No se pueden eliminar repuestos de una orden que ya fue entregada.');
      }

      await client.query('DELETE FROM Detalle_Reparacion WHERE id_detalle_rep = $1;', [idDetalleRep]);

      const queryDevolucion = `
        UPDATE Productos 
        SET cantidad = cantidad + $1 
        WHERE id_producto = $2;
      `;
      await client.query(queryDevolucion, [cantidadDevolver, idProducto]);

      const queryCosto = `
        UPDATE Reparacion 
        SET costo_total = costo_mano_obra + (SELECT COALESCE(SUM(costo_total), 0) FROM Detalle_Reparacion WHERE id_reparacion = $1)
        WHERE id_reparacion = $1
        RETURNING *;
      `;
      const resRepActualizada = await client.query(queryCosto, [idReparacion]);

      // Registro garantizado en Kardex (Movimiento_Stock)
      await client.query(
        `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
         VALUES ($1, $2, 'INGRESO', $3, 'Devolución de Taller', $4);`,
        [
          idProducto,
          idUsuarioOperador,
          cantidadDevolver,
          `Cancelación de uso en Orden #${idReparacion}`
        ]
      );

      try {
        await client.query(
          `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
           VALUES ($1, $2, 'Taller', 'Devolución de Repuesto', $3);`,
          [
            idUsuarioOperador || null,
            nombreUsuarioOperador || 'Usuario',
            `${cantidadDevolver} un. de "${detalle.producto_nombre}" devueltas al inventario desde Orden #${idReparacion}.`
          ]
        );
      } catch {
        // Ignorar
      }

      await client.query('COMMIT');

      return {
        message: 'Repuesto eliminado de la orden y reintegrado al inventario con éxito',
        reparacion: resRepActualizada.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
