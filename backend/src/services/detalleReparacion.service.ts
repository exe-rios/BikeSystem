import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class DetalleReparacionService {
  static async agregarRepuesto(datos: {
    id_reparacion: number | string;
    id_producto: number | string;
    cantidad: number | string;
    precio_unitario: number | string;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const { id_reparacion, id_producto, cantidad, precio_unitario, idUsuarioOperador, nombreUsuarioOperador } = datos;

    if (!id_reparacion || !id_producto || !cantidad || precio_unitario === undefined) {
      throw new BadRequestError('Completá todos los campos: orden, repuesto, cantidad y precio.');
    }

    const idRepNum = Number(id_reparacion);
    const idProdNum = Number(id_producto);
    const cantNum = Number(cantidad);
    const precioNum = Number(precio_unitario);

    if (isNaN(idRepNum) || idRepNum <= 0) {
      throw new BadRequestError('No se encontró esa orden de taller.');
    }

    if (isNaN(idProdNum) || idProdNum <= 0) {
      throw new BadRequestError('No se encontró ese repuesto.');
    }

    if (isNaN(cantNum) || cantNum <= 0 || !Number.isInteger(cantNum)) {
      throw new BadRequestError('La cantidad debe ser al menos 1.');
    }

    if (isNaN(precioNum) || precioNum < 0) {
      throw new BadRequestError('El precio no puede ser negativo.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resRep = await client.query('SELECT id_reparacion, estado, costo_mano_obra FROM Reparacion WHERE id_reparacion = $1 FOR UPDATE;', [idRepNum]);
      if (resRep.rowCount === 0) {
        throw new NotFoundError('Esa orden de taller no existe.');
      }

      const resProd = await client.query('SELECT id_producto, nombre, cantidad FROM Productos WHERE id_producto = $1 FOR UPDATE;', [idProdNum]);
      if (resProd.rowCount === 0) {
        throw new NotFoundError('Ese repuesto no existe en el inventario.');
      }

      const producto = resProd.rows[0];
      if (Number(producto.cantidad) < cantNum) {
        throw new BadRequestError(`No hay suficiente stock de "${producto.nombre}". Hay ${producto.cantidad} unidades.`);
      }

      const costo_total_detalle = cantNum * precioNum;

      const queryInsert = `
        INSERT INTO Detalle_Reparacion (id_reparacion, id_producto, cantidad, precio_unitario, costo_total)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const resultDetalle = await client.query(queryInsert, [idRepNum, idProdNum, cantNum, precioNum, costo_total_detalle]);

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

      if (idUsuarioOperador) {
        try {
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
        } catch {
          // Ignorar
        }
      }

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

  static async obtenerRepuestosDeReparacion(idReparacion: number) {
    if (isNaN(idReparacion) || idReparacion <= 0) {
      throw new BadRequestError('No se encontró esa orden de taller.');
    }

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

  static async eliminarRepuesto(idDetalleRep: number, operador: {
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    if (isNaN(idDetalleRep) || idDetalleRep <= 0) {
      throw new BadRequestError('No se encontró ese repuesto en la orden.');
    }

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
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

      if (idUsuarioOperador) {
        try {
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
        } catch {
          // Ignorar
        }
      }

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
