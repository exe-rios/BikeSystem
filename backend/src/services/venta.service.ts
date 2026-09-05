import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class VentaService {
  static async crearVenta(datos: {
    id_cliente: number | string;
    id_metodo_pago?: number | string | undefined;
    detalles: Array<{ id_producto: number | string; cantidad: number | string; precio_unitario?: number | string | undefined }>;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const { id_cliente, id_metodo_pago, detalles, idUsuarioOperador, nombreUsuarioOperador } = datos;
    const idClienteNum = Number(id_cliente);
    const idUsuarioNum = Number(idUsuarioOperador) || 1;
    const idMetodoPagoNum = Number(id_metodo_pago) || 1;

    if (!id_cliente || isNaN(idClienteNum) || idClienteNum <= 0) {
      throw new BadRequestError('Seleccioná un cliente para la venta.');
    }

    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      throw new BadRequestError('Agregá al menos un artículo a la venta.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const queryVenta = `
        INSERT INTO Venta (id_cliente, id_usuario, id_metodo_pago, costo_total)
        VALUES ($1, $2, $3, 0)
        RETURNING *;
      `;
      const resultVenta = await client.query(queryVenta, [idClienteNum, idUsuarioNum, idMetodoPagoNum]);
      const ventaCreada = resultVenta.rows[0];
      const id_venta = ventaCreada.id_venta;

      let costoTotalCalculado = 0;
      const detallesGuardados = [];

      for (const item of detalles) {
        const { id_producto, cantidad, precio_unitario } = item;
        const idProdNum = Number(id_producto);
        const cantNum = Number(cantidad);
        const precioNum = Number(precio_unitario);

        if (!id_producto || isNaN(idProdNum) || idProdNum <= 0) {
          throw new BadRequestError('Uno de los artículos seleccionados no es válido.');
        }

        if (isNaN(cantNum) || cantNum <= 0 || !Number.isInteger(cantNum)) {
          throw new BadRequestError('La cantidad debe ser al menos 1.');
        }

        if (isNaN(precioNum) || precioNum < 0) {
          throw new BadRequestError('El precio no puede ser negativo.');
        }

        const queryProducto = `
          SELECT id_producto, nombre, marca, modelo, tipo_prod, cantidad, precio 
          FROM Productos 
          WHERE id_producto = $1
          FOR UPDATE;
        `;
        const resultProd = await client.query(queryProducto, [idProdNum]);

        if (resultProd.rowCount === 0) {
          throw new NotFoundError(`El artículo #${idProdNum} no existe en el inventario.`);
        }

        const producto = resultProd.rows[0];
        if (producto.cantidad < cantNum) {
          throw new BadRequestError(`No hay suficiente stock de "${producto.nombre}". Hay ${producto.cantidad}, pediste ${cantNum}.`);
        }

        const precioOficial = Number(producto.precio) || 0;
        const precioFinal = (precioNum !== undefined && !isNaN(precioNum) && precioNum > 0) ? precioNum : precioOficial;
        const subtotal = cantNum * precioFinal;
        costoTotalCalculado += subtotal;

        const queryDetalle = `
          INSERT INTO Detalle_Venta (id_venta, id_producto, cantidad, precio_unitario, costo_total)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        const resultDetalle = await client.query(queryDetalle, [id_venta, idProdNum, cantNum, precioFinal, subtotal]);
        detallesGuardados.push(resultDetalle.rows[0]);

        const queryDescuento = `
          UPDATE Productos 
          SET cantidad = cantidad - $1 
          WHERE id_producto = $2;
        `;
        await client.query(queryDescuento, [cantNum, idProdNum]);

        if (producto.tipo_prod === 'bicicleta') {
          const queryBiciCliente = `
            INSERT INTO Bicicleta (id_cliente, marca, modelo)
            VALUES ($1, $2, $3);
          `;
          await client.query(queryBiciCliente, [
            idClienteNum,
            producto.marca || producto.nombre,
            producto.modelo || 'Bicicleta nueva'
          ]);
        }
      }

      const queryActualizarTotal = `
        UPDATE Venta 
        SET costo_total = $1 
        WHERE id_venta = $2
        RETURNING *;
      `;
      const resultTotal = await client.query(queryActualizarTotal, [costoTotalCalculado, id_venta]);

      try {
        await client.query(
          `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
           VALUES ($1, $2, 'Ventas', 'Registro de Venta', $3);`,
          [
            idUsuarioNum,
            nombreUsuarioOperador || 'Vendedor',
            `Venta #${id_venta} registrada por $${costoTotalCalculado}. Cliente #${idClienteNum}, ${detallesGuardados.length} artículo(s).`
          ]
        );
      } catch {
        // Ignorar
      }

      await client.query('COMMIT');

      return {
        venta: resultTotal.rows[0],
        detalles: detallesGuardados
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async obtenerVentas(busqueda?: string | undefined) {
    let query = `
      SELECT 
        v.id_venta,
        v.fecha,
        v.costo_total,
        v.id_cliente,
        COALESCE(v.estado, 'COMPLETADA') AS estado,
        v.id_metodo_pago,
        COALESCE(mp.nombre, 'Efectivo') AS metodo_pago_nombre,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.dni AS cliente_dni,
        c.telefono AS cliente_telefono,
        u.nombre_usuario AS usuario_nombre,
        u.rol AS usuario_rol
      FROM Venta v
      INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
      LEFT JOIN Metodo_Pago mp ON v.id_metodo_pago = mp.id_metodo_pago
    `;

    const params: any[] = [];
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` WHERE (
        c.nombre ILIKE $1 OR 
        c.apellido ILIKE $1 OR 
        c.dni ILIKE $1 OR 
        u.nombre_usuario ILIKE $1 OR 
        CAST(v.id_venta AS TEXT) ILIKE $1
      )`;
      params.push(term);
    }

    query += ` ORDER BY v.id_venta DESC;`;

    const result = await pool.query(query, params);
    return {
      total: result.rowCount || 0,
      ventas: result.rows
    };
  }

  static async obtenerVentaPorId(id: number) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('El número de factura no es válido.');
    }

    const queryVenta = `
      SELECT 
        v.id_venta,
        v.fecha,
        v.costo_total,
        v.id_cliente,
        COALESCE(v.estado, 'COMPLETADA') AS estado,
        v.id_metodo_pago,
        COALESCE(mp.nombre, 'Efectivo') AS metodo_pago_nombre,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.dni AS cliente_dni,
        c.telefono AS cliente_telefono,
        c.email AS cliente_email,
        c.direccion AS cliente_direccion,
        u.nombre_usuario AS usuario_nombre,
        u.rol AS usuario_rol
      FROM Venta v
      INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
      LEFT JOIN Metodo_Pago mp ON v.id_metodo_pago = mp.id_metodo_pago
      WHERE v.id_venta = $1;
    `;
    const resultVenta = await pool.query(queryVenta, [id]);

    if (resultVenta.rowCount === 0) {
      throw new NotFoundError('La venta solicitada no fue encontrada.');
    }

    const queryDetalles = `
      SELECT 
        dv.id_detalle_venta,
        dv.id_detalle_venta AS id_detalle,
        dv.id_venta,
        dv.id_producto,
        dv.cantidad,
        dv.precio_unitario,
        dv.costo_total,
        p.nombre,
        p.nombre AS producto_nombre,
        p.tipo_prod,
        p.tipo_prod AS producto_tipo,
        COALESCE(pb.marca, p.marca) AS marca,
        COALESCE(pb.marca, p.marca) AS producto_marca,
        COALESCE(p.modelo, '') AS modelo,
        pb.color,
        pb.color AS producto_color,
        pb.rodado,
        pb.rodado AS producto_rodado,
        pb.talle,
        pb.talle AS producto_talle
      FROM Detalle_Venta dv
      INNER JOIN Productos p ON dv.id_producto = p.id_producto
      LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
      WHERE dv.id_venta = $1
      ORDER BY dv.id_detalle_venta ASC;
    `;
    const resultDetalles = await pool.query(queryDetalles, [id]);

    return {
      venta: resultVenta.rows[0],
      detalles: resultDetalles.rows,
      productos_vendidos: resultDetalles.rows
    };
  }

  static async obtenerMetodosPago() {
    const query = 'SELECT * FROM Metodo_Pago ORDER BY id_metodo_pago ASC;';
    const result = await pool.query(query);
    return result.rows;
  }

  static async obtenerGarantiasBicicletas(busqueda?: string | undefined) {
    let query = `
      SELECT 
        dv.id_detalle_venta,
        v.id_venta,
        v.fecha AS fecha_venta,
        v.costo_total,
        c.id_cliente,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.dni AS cliente_dni,
        c.telefono AS cliente_telefono,
        c.email AS cliente_email,
        u.nombre_usuario AS vendedor,
        p.id_producto,
        p.nombre AS producto_nombre,
        COALESCE(pb.marca, p.marca) AS marca,
        COALESCE(p.modelo, '') AS modelo,
        pb.color,
        pb.rodado,
        pb.talle,
        dv.cantidad,
        dv.precio_unitario,
        (v.fecha::DATE + 30) AS fecha_vencimiento,
        ((v.fecha::DATE + 30) - CURRENT_DATE)::INT AS dias_restantes,
        CASE 
          WHEN (v.fecha::DATE + 30) < CURRENT_DATE THEN 'vencida'
          WHEN (v.fecha::DATE + 30) - CURRENT_DATE <= 5 THEN 'por_vencer'
          ELSE 'vigente'
        END AS estado_garantia
      FROM Detalle_Venta dv
      INNER JOIN Venta v ON dv.id_venta = v.id_venta
      INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
      INNER JOIN Productos p ON dv.id_producto = p.id_producto
      LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
      WHERE (v.estado IS NULL OR v.estado != 'ANULADA')
        AND p.tipo_prod = 'bicicleta'
    `;

    const params: any[] = [];
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` AND (
        p.nombre ILIKE $1 OR 
        p.marca ILIKE $1 OR 
        pb.marca ILIKE $1 OR 
        c.nombre ILIKE $1 OR 
        c.apellido ILIKE $1 OR 
        c.dni ILIKE $1 OR
        CAST(v.id_venta AS TEXT) ILIKE $1
      )`;
      params.push(term);
    }

    query += ` ORDER BY v.id_venta DESC;`;

    const result = await pool.query(query, params);

    let vigentes = 0;
    let por_vencer = 0;
    let vencidas = 0;

    result.rows.forEach(g => {
      if (g.estado_garantia === 'vencida') {
        vencidas++;
      } else if (g.estado_garantia === 'por_vencer') {
        por_vencer++;
      } else {
        vigentes++;
      }
    });

    return {
      total: result.rowCount || 0,
      resumen: {
        total: result.rowCount || 0,
        vigentes,
        por_vencer,
        vencidas
      },
      garantias: result.rows
    };
  }

  static async agregarDetalleVenta(idVenta: number, item: { id_producto: number | string; cantidad: number | string; precio_unitario?: number | string | undefined }) {
    if (isNaN(idVenta) || idVenta <= 0) {
      throw new BadRequestError('El número de venta no es válido.');
    }

    const { id_producto, cantidad, precio_unitario } = item;
    const idProdNum = Number(id_producto);
    const cantNum = Number(cantidad);
    const precioNum = Number(precio_unitario);

    if (isNaN(idProdNum) || idProdNum <= 0) {
      throw new BadRequestError('El identificador del producto no es válido.');
    }

    if (isNaN(cantNum) || cantNum <= 0 || !Number.isInteger(cantNum)) {
      throw new BadRequestError('La cantidad debe ser un entero positivo.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resVenta = await client.query('SELECT * FROM Venta WHERE id_venta = $1 FOR UPDATE;', [idVenta]);
      if (resVenta.rowCount === 0) {
        throw new NotFoundError('La venta no existe.');
      }

      const resProd = await client.query('SELECT id_producto, nombre, precio, cantidad FROM Productos WHERE id_producto = $1 FOR UPDATE;', [idProdNum]);
      if (resProd.rowCount === 0) {
        throw new NotFoundError('El producto no existe en el catálogo.');
      }

      const prod = resProd.rows[0];
      if (prod.cantidad < cantNum) {
        throw new BadRequestError(`Stock insuficiente para "${prod.nombre}".`);
      }

      const finalPrice = (precioNum !== undefined && !isNaN(precioNum) && precioNum > 0) ? precioNum : Number(prod.precio);
      const subtotal = cantNum * finalPrice;

      const queryInsert = `
        INSERT INTO Detalle_Venta (id_venta, id_producto, cantidad, precio_unitario, costo_total)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const resDetalle = await client.query(queryInsert, [idVenta, idProdNum, cantNum, finalPrice, subtotal]);

      await client.query('UPDATE Productos SET cantidad = cantidad - $1 WHERE id_producto = $2;', [cantNum, idProdNum]);

      await client.query(
        'UPDATE Venta SET costo_total = (SELECT COALESCE(SUM(costo_total), 0) FROM Detalle_Venta WHERE id_venta = $1) WHERE id_venta = $1;',
        [idVenta]
      );

      await client.query('COMMIT');

      return resDetalle.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async anularVenta(id: number, motivo: string, operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('El número de venta no es válido.');
    }

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const resVenta = await client.query('SELECT * FROM Venta WHERE id_venta = $1 FOR UPDATE;', [id]);
      if (resVenta.rowCount === 0) {
        throw new NotFoundError('La venta no existe.');
      }

      const venta = resVenta.rows[0];
      if (venta.estado === 'ANULADA') {
        throw new BadRequestError('La venta ya se encuentra anulada.');
      }

      const resDetalles = await client.query('SELECT id_producto, cantidad FROM Detalle_Venta WHERE id_venta = $1;', [id]);
      for (const d of resDetalles.rows) {
        await client.query('UPDATE Productos SET cantidad = cantidad + $1 WHERE id_producto = $2;', [d.cantidad, d.id_producto]);

        if (idUsuarioOperador) {
          try {
            await client.query(
              `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
               VALUES ($1, $2, 'INGRESO', $3, 'Anulación de Venta', $4);`,
              [d.id_producto, idUsuarioOperador, d.cantidad, `Reintegro por venta #${id} anulada: ${motivo || 'Sin motivo'}`]
            );
          } catch {
            // Ignorar
          }
        }
      }

      await client.query(
        `UPDATE Venta 
         SET estado = 'ANULADA',
             fecha_anulacion = CURRENT_TIMESTAMP,
             motivo_anulacion = $2
         WHERE id_venta = $1;`,
        [id, motivo || 'Anulada por administración']
      );

      try {
        await client.query(
          `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
           VALUES ($1, $2, 'Ventas', 'Anulación de Venta', $3);`,
          [
            idUsuarioOperador || null,
            nombreUsuarioOperador || 'Usuario',
            `Venta #${id} anulada. Motivo: ${motivo || 'Sin especificar'}. Total reintegrado: $${venta.costo_total}.`
          ]
        );
      } catch {
        // Ignorar
      }

      await client.query('COMMIT');

      return {
        message: 'Venta anulada y stock reintegrado con éxito',
        id_venta: id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
