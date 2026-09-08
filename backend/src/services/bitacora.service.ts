import { pool } from '../config/db.js';
import { ForbiddenError } from '../utils/errors.js';
import {
  normalizarPaginacion,
  aplicarPaginacionSQL,
  calcularMetaPaginacion,
  type MetaPaginacion
} from '../utils/pagination.js';

export interface FiltrosBitacora {
  modulo?: string | undefined;
  busqueda?: string | undefined;
  limite?: number | string | undefined;
  pagina?: number | string | undefined;
  rolUsuario?: string | undefined;
}

export interface RespuestaBitacora extends MetaPaginacion {
  registros: any[];
}

/** Servicio de auditoría y consulta de bitácora de eventos del sistema. */
export class BitacoraService {
  /** Consulta registros de auditoría con paginación y filtros por módulo y texto. */
  static async obtenerBitacora(filtros: FiltrosBitacora): Promise<RespuestaBitacora> {
    const { modulo, busqueda, limite, pagina, rolUsuario } = filtros;

    if (rolUsuario !== 'ADMIN' && rolUsuario !== 'SUPERADMIN') {
      throw new ForbiddenError('Solo un administrador puede ver la auditoría.');
    }

    const paginacion = normalizarPaginacion({ limite, pagina }, { limitePorDefecto: 10, maxLimite: 100 });

    let query = `
      SELECT b.id_bitacora, b.id_usuario, b.nombre_usuario, b.modulo, b.accion, b.descripcion, b.created_at,
             u.rol AS usuario_rol,
             COUNT(*) OVER()::INT AS total_registros
      FROM Bitacora_Actividad b
      LEFT JOIN Usuario u ON b.id_usuario = u.id_usuario
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (modulo && typeof modulo === 'string' && modulo.trim().toLowerCase() !== 'todos') {
      query += ` AND b.modulo ILIKE $${paramIndex}`;
      params.push(modulo.trim());
      paramIndex++;
    }

    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      query += ` AND (b.nombre_usuario ILIKE $${paramIndex} OR b.accion ILIKE $${paramIndex} OR b.descripcion ILIKE $${paramIndex})`;
      params.push(`%${busqueda.trim()}%`);
      paramIndex++;
    }

    query = aplicarPaginacionSQL(`${query} ORDER BY b.id_bitacora DESC`, params, paginacion);

    const result = await pool.query(query, params);
    const total = Number(result.rows[0]?.total_registros) || 0;
    const meta = calcularMetaPaginacion(total, paginacion);

    return {
      ...meta,
      registros: result.rows
    };
  }
}
