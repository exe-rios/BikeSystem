import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class BicicletaService {
  static async obtenerBicicletas(filtros: { id_cliente?: string | number | undefined; busqueda?: string | undefined }) {
    const { id_cliente, busqueda } = filtros;

    let query = `
      SELECT b.*, c.nombre, c.apellido, c.dni, c.telefono, c.email
      FROM Bicicleta b
      INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (id_cliente) {
      const idClienteNum = Number(id_cliente);
      if (!isNaN(idClienteNum) && idClienteNum > 0) {
        whereClauses.push(`b.id_cliente = $${paramIdx}`);
        params.push(idClienteNum);
        paramIdx++;
      }
    }

    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      whereClauses.push(`(
        b.marca ILIKE $${paramIdx} OR 
        b.modelo ILIKE $${paramIdx} OR 
        c.nombre ILIKE $${paramIdx} OR 
        c.apellido ILIKE $${paramIdx} OR 
        c.dni ILIKE $${paramIdx} OR 
        CAST(b.id_bicicleta AS TEXT) ILIKE $${paramIdx}
      )`);
      params.push(term);
      paramIdx++;
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ` ORDER BY b.id_bicicleta DESC;`;

    const result = await pool.query(query, params);
    return {
      total: result.rowCount || 0,
      bicicletas: result.rows
    };
  }

  static async obtenerBicicletaPorId(id: number) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró esa bicicleta.');
    }

    const query = `
      SELECT b.*, c.nombre, c.apellido, c.dni, c.telefono, c.email
      FROM Bicicleta b
      INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
      WHERE b.id_bicicleta = $1;
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Esa bicicleta no existe.');
    }

    return result.rows[0];
  }

  static async crearBicicleta(datos: {
    id_cliente: number | string;
    marca: string;
    modelo?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const { id_cliente, marca, modelo, idUsuarioOperador, nombreUsuarioOperador } = datos;
    const idClienteNum = Number(id_cliente);

    if (!id_cliente || isNaN(idClienteNum) || idClienteNum <= 0) {
      throw new BadRequestError('Seleccioná el dueño de la bicicleta.');
    }

    if (!marca || typeof marca !== 'string' || marca.trim().length === 0) {
      throw new BadRequestError('Escribí la marca de la bicicleta.');
    }

    const checkCliente = await pool.query('SELECT id_cliente, nombre, apellido FROM Cliente WHERE id_cliente = $1;', [idClienteNum]);
    if (checkCliente.rowCount === 0) {
      throw new NotFoundError('Ese cliente no existe.');
    }

    const query = `
      INSERT INTO Bicicleta (id_cliente, marca, modelo)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      idClienteNum,
      marca.trim(),
      modelo ? String(modelo).trim() : null
    ]);

    const nuevaBici = result.rows[0];

    // Registrar en Bitacora_Actividad
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Bicicletas', 'Registro de Bicicleta', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Bicicleta registrada: "${marca.trim()} ${modelo ? String(modelo).trim() : ''}" (ID #${nuevaBici.id_bicicleta}) para cliente "${checkCliente.rows[0].nombre} ${checkCliente.rows[0].apellido}".`
        ]
      );
    } catch {
      // Ignorar
    }

    const queryCompleta = `
      SELECT b.*, c.nombre, c.apellido, c.dni, c.telefono, c.email
      FROM Bicicleta b
      INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
      WHERE b.id_bicicleta = $1;
    `;
    const resCompleta = await pool.query(queryCompleta, [nuevaBici.id_bicicleta]);

    return resCompleta.rows[0] || nuevaBici;
  }

  static async actualizarBicicleta(id: number, datos: {
    marca: string;
    modelo?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró esa bicicleta.');
    }

    const { marca, modelo, idUsuarioOperador, nombreUsuarioOperador } = datos;

    if (!marca || typeof marca !== 'string' || marca.trim().length === 0) {
      throw new BadRequestError('Escribí la marca de la bicicleta.');
    }

    const query = `
      UPDATE Bicicleta 
      SET marca = $1, modelo = $2
      WHERE id_bicicleta = $3
      RETURNING *;
    `;
    const result = await pool.query(query, [
      marca.trim(),
      modelo ? String(modelo).trim() : null,
      id
    ]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Esa bicicleta no existe.');
    }

    const biciActualizada = result.rows[0];

    // Registrar en Bitacora_Actividad
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Bicicletas', 'Modificación de Bicicleta', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Bicicleta actualizada: "${marca.trim()} ${modelo ? String(modelo).trim() : ''}" (ID #${id}).`
        ]
      );
    } catch {
      // Ignorar
    }

    const queryCompleta = `
      SELECT b.*, c.nombre, c.apellido, c.dni, c.telefono, c.email
      FROM Bicicleta b
      INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
      WHERE b.id_bicicleta = $1;
    `;
    const resCompleta = await pool.query(queryCompleta, [id]);

    return resCompleta.rows[0] || biciActualizada;
  }

  static async eliminarBicicleta(id: number, operador: {
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró esa bicicleta.');
    }

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;

    const resBici = await pool.query('SELECT marca, modelo FROM Bicicleta WHERE id_bicicleta = $1;', [id]);
    if (resBici.rowCount === 0) {
      throw new NotFoundError('Esa bicicleta no existe.');
    }
    const datosBici = resBici.rows[0];

    await pool.query('DELETE FROM Bicicleta WHERE id_bicicleta = $1 RETURNING *;', [id]);

    // Registrar en Bitacora_Actividad
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Bicicletas', 'Baja de Bicicleta', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Bicicleta eliminada: "${datosBici.marca} ${datosBici.modelo || ''}" (ID #${id}).`
        ]
      );
    } catch {
      // Ignorar
    }

    return { message: 'Bicicleta eliminada correctamente' };
  }

  static async obtenerHistorialBicicleta(id: number) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró esa bicicleta.');
    }

    const queryBici = `
      SELECT b.*, 
             c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
             c.dni AS cliente_dni, c.telefono AS cliente_telefono, c.email AS cliente_email
      FROM Bicicleta b
      INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
      WHERE b.id_bicicleta = $1;
    `;
    const resBici = await pool.query(queryBici, [id]);

    if (resBici.rowCount === 0) {
      throw new NotFoundError('Esa bicicleta no existe.');
    }

    const queryReparaciones = `
      WITH repuestos_agg AS (
        SELECT 
          dr.id_reparacion,
          json_agg(
            json_build_object(
              'id_detalle_rep', dr.id_detalle_rep,
              'cantidad', dr.cantidad,
              'precio_unitario', dr.precio_unitario,
              'costo_total', dr.costo_total,
              'repuesto_nombre', p.nombre,
              'repuesto_marca', p.marca
            ) ORDER BY dr.id_detalle_rep ASC
          ) AS repuestos_utilizados
        FROM Detalle_Reparacion dr
        INNER JOIN Productos p ON dr.id_producto = p.id_producto
        GROUP BY dr.id_reparacion
      )
      SELECT 
        r.id_reparacion, 
        r.fecha_ingreso, 
        r.fecha_egreso, 
        r.estado, 
        r.descripcion, 
        r.costo_mano_obra, 
        r.costo_total,
        u.nombre_usuario AS mecanico,
        COALESCE(ra.repuestos_utilizados, '[]'::json) AS repuestos_utilizados
      FROM Reparacion r
      INNER JOIN Usuario u ON r.id_usuario = u.id_usuario
      LEFT JOIN repuestos_agg ra ON r.id_reparacion = ra.id_reparacion
      WHERE r.id_bicicleta = $1
      ORDER BY r.id_reparacion DESC;
    `;
    const resReparaciones = await pool.query(queryReparaciones, [id]);

    return {
      bicicleta: resBici.rows[0],
      historial_reparaciones: resReparaciones.rows,
      total_reparaciones: resReparaciones.rowCount || 0
    };
  }
}
