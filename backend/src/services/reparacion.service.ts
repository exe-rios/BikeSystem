import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const ESTADOS_REPARACION_VALIDOS = ['Recibida', 'En Reparación', 'Lista', 'Entregada'];

const REPARACION_SELECT_BASE = `
  SELECT r.id_reparacion, r.fecha_ingreso, r.fecha_egreso, r.estado, r.descripcion, 
         r.costo_mano_obra, r.costo_total,
         b.id_bicicleta, b.marca, b.modelo, 
         c.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
  FROM Reparacion r
  INNER JOIN Bicicleta b ON r.id_bicicleta = b.id_bicicleta
  INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
`;

export class ReparacionService {
  static async obtenerReparaciones(filtros: { estado?: string | undefined; busqueda?: string | undefined }) {
    const { estado, busqueda } = filtros;
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (estado && typeof estado === 'string' && estado.trim() !== 'todos') {
      whereClauses.push(`r.estado = $${paramIdx}`);
      params.push(estado.trim());
      paramIdx++;
    }

    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      whereClauses.push(`(
        r.descripcion ILIKE $${paramIdx} OR 
        b.marca ILIKE $${paramIdx} OR 
        b.modelo ILIKE $${paramIdx} OR 
        c.nombre ILIKE $${paramIdx} OR 
        c.apellido ILIKE $${paramIdx} OR 
        CAST(r.id_reparacion AS TEXT) ILIKE $${paramIdx}
      )`);
      params.push(term);
      paramIdx++;
    }

    let query = `${REPARACION_SELECT_BASE}`;
    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }
    query += ` ORDER BY r.id_reparacion DESC;`;

    const queryResumen = `
      SELECT 
        COUNT(*) FILTER (WHERE estado != 'Entregada')::integer AS total_activas,
        COUNT(*) FILTER (WHERE estado = 'Recibida')::integer AS recibidas_count,
        COUNT(*) FILTER (WHERE estado = 'En Reparación')::integer AS en_reparacion_count,
        COUNT(*) FILTER (WHERE estado = 'Lista')::integer AS listas_count,
        COUNT(*) FILTER (WHERE estado = 'Entregada')::integer AS total_entregadas,
        COALESCE(SUM(costo_total) FILTER (WHERE estado = 'Entregada'), 0)::numeric AS total_historico,
        COALESCE(AVG(costo_total) FILTER (WHERE estado = 'Entregada'), 0)::numeric AS promedio_historico
      FROM Reparacion;
    `;

    const [result, resResumen] = await Promise.all([
      pool.query(query, params),
      pool.query(queryResumen)
    ]);

    return {
      total: result.rowCount || 0,
      resumen: resResumen.rows[0] || {
        total_activas: 0,
        recibidas_count: 0,
        en_reparacion_count: 0,
        listas_count: 0,
        total_entregadas: 0,
        total_historico: 0,
        promedio_historico: 0
      },
      reparaciones: result.rows
    };
  }

  static async obtenerReparacionPorId(id: number) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró esa orden de taller.');
    }

    const resultCabecera = await pool.query(`${REPARACION_SELECT_BASE} WHERE r.id_reparacion = $1;`, [id]);
    if (resultCabecera.rowCount === 0) {
      throw new NotFoundError('Esa orden de taller no existe.');
    }

    const queryDetalles = `
      SELECT dr.*, p.nombre, p.marca, p.tipo_prod, p.precio
      FROM Detalle_Reparacion dr
      INNER JOIN Productos p ON dr.id_producto = p.id_producto
      WHERE dr.id_reparacion = $1
      ORDER BY dr.id_detalle_rep ASC;
    `;
    const resultDetalles = await pool.query(queryDetalles, [id]);

    return {
      reparacion: resultCabecera.rows[0],
      repuestos_utilizados: resultDetalles.rows
    };
  }

  static async crearReparacion(datos: {
    id_bicicleta: number | string;
    id_usuario: number | string;
    estado?: string | undefined;
    descripcion: string;
    costo_mano_obra?: number | string | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const { id_bicicleta, id_usuario, estado, descripcion, costo_mano_obra, nombreUsuarioOperador } = datos;
    const idBiciNum = Number(id_bicicleta);
    const idUsuarioNum = Number(id_usuario);

    if (!id_bicicleta || isNaN(idBiciNum) || idBiciNum <= 0) {
      throw new BadRequestError('Seleccioná una bicicleta para el ingreso.');
    }

    if (!id_usuario || isNaN(idUsuarioNum) || idUsuarioNum <= 0) {
      throw new BadRequestError('No se pudo identificar quién hace el registro. Volvé a iniciar sesión.');
    }

    const estadoFinal = estado ? String(estado).trim() : 'Recibida';
    if (!ESTADOS_REPARACION_VALIDOS.includes(estadoFinal)) {
      throw new BadRequestError('Estado no válido. Opciones: Recibida, En Reparación, Lista o Entregada.');
    }

    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 3) {
      throw new BadRequestError('Describí el problema o servicio a realizar (mínimo 3 letras).');
    }

    let montoManoObra = 0;
    if (costo_mano_obra !== undefined && costo_mano_obra !== null && costo_mano_obra !== '') {
      montoManoObra = Number(costo_mano_obra);
      if (isNaN(montoManoObra) || montoManoObra < 0) {
        throw new BadRequestError('El costo de mano de obra no puede ser negativo.');
      }
    }

    const checkBici = await pool.query('SELECT id_bicicleta, marca, modelo FROM Bicicleta WHERE id_bicicleta = $1;', [idBiciNum]);
    if (checkBici.rowCount === 0) {
      throw new NotFoundError('Esa bicicleta no existe.');
    }

    const queryInsert = `
      INSERT INTO Reparacion (id_bicicleta, id_usuario, estado, descripcion, costo_mano_obra, costo_total)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const resultInsert = await pool.query(queryInsert, [
      idBiciNum,
      idUsuarioNum,
      estadoFinal,
      descripcion.trim(),
      montoManoObra,
      montoManoObra
    ]);

    const nuevaRep = resultInsert.rows[0];

    // Registrar en Bitácora
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Taller', 'Ingreso de Reparación', $3);`,
        [
          idUsuarioNum,
          nombreUsuarioOperador || 'Usuario',
          `Orden #${nuevaRep.id_reparacion} creada para bicicleta #${idBiciNum} (${checkBici.rows[0].marca} ${checkBici.rows[0].modelo || ''}). Estado: ${estadoFinal}, Mano de obra: $${montoManoObra}.`
        ]
      );
    } catch {
      // Ignorar
    }

    const resultCompleto = await pool.query(`${REPARACION_SELECT_BASE} WHERE r.id_reparacion = $1;`, [nuevaRep.id_reparacion]);
    return resultCompleto.rows[0] || nuevaRep;
  }

  static async actualizarEstadoReparacion(id: number, datos: {
    estado?: string | undefined;
    descripcion?: string | undefined;
    costo_mano_obra?: number | string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró esa orden de taller.');
    }

    const { estado, descripcion, costo_mano_obra, idUsuarioOperador, nombreUsuarioOperador } = datos;

    if (!estado && descripcion === undefined && costo_mano_obra === undefined) {
      throw new BadRequestError('Enviá al menos un dato para actualizar la orden.');
    }

    let estadoNormalizado: string | null = null;
    if (estado !== undefined) {
      estadoNormalizado = String(estado).trim();
      if (!ESTADOS_REPARACION_VALIDOS.includes(estadoNormalizado)) {
        throw new BadRequestError('Estado no válido. Opciones: Recibida, En Reparación, Lista o Entregada.');
      }
    }

    let montoManoObra: number | null = null;
    if (costo_mano_obra !== undefined && costo_mano_obra !== null && costo_mano_obra !== '') {
      montoManoObra = Number(costo_mano_obra);
      if (isNaN(montoManoObra) || montoManoObra < 0) {
        throw new BadRequestError('El costo de mano de obra no puede ser negativo.');
      }
    }

    let fechaEgresoClause = '';
    if (estadoNormalizado === 'Lista' || estadoNormalizado === 'Entregada') {
      fechaEgresoClause = `, fecha_egreso = COALESCE(fecha_egreso, CURRENT_DATE)`;
    } else if (estadoNormalizado === 'Recibida' || estadoNormalizado === 'En Reparación') {
      fechaEgresoClause = `, fecha_egreso = NULL`;
    }

    const query = `
      UPDATE Reparacion 
      SET estado = COALESCE($1, estado), 
          descripcion = COALESCE($2, descripcion), 
          costo_mano_obra = COALESCE($3, costo_mano_obra),
          costo_total = COALESCE($3, costo_mano_obra) + (SELECT COALESCE(SUM(costo_total), 0) FROM Detalle_Reparacion WHERE id_reparacion = $4)
          ${fechaEgresoClause}
      WHERE id_reparacion = $4
      RETURNING *;
    `;
    const resultUpdate = await pool.query(query, [
      estadoNormalizado,
      descripcion !== undefined ? String(descripcion).trim() : null,
      montoManoObra,
      id
    ]);

    if (resultUpdate.rowCount === 0) {
      throw new NotFoundError('Esa orden de taller no existe.');
    }

    const ordenActualizada = resultUpdate.rows[0];

    // Registrar en Bitácora
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Taller', 'Actualización de Orden', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Orden #${id} actualizada. Estado: ${ordenActualizada.estado}, Mano de obra: $${ordenActualizada.costo_mano_obra}, Total: $${ordenActualizada.costo_total}.`
        ]
      );
    } catch {
      // Ignorar
    }

    const resultCompleto = await pool.query(`${REPARACION_SELECT_BASE} WHERE r.id_reparacion = $1;`, [id]);
    return resultCompleto.rows[0] || ordenActualizada;
  }
}
