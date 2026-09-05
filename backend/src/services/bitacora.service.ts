import { pool } from '../config/db.js';
import { ForbiddenError } from '../utils/errors.js';

export interface FiltrosBitacora {
  modulo?: string | undefined;
  busqueda?: string | undefined;
  limite?: number | string | undefined;
  rolUsuario?: string | undefined;
}

export class BitacoraService {
  static async obtenerBitacora(filtros: FiltrosBitacora): Promise<{ total: number; registros: any[] }> {
    const { modulo, busqueda, limite, rolUsuario } = filtros;

    if (rolUsuario !== 'ADMIN' && rolUsuario !== 'SUPERADMIN') {
      throw new ForbiddenError('Solo un administrador puede ver la auditoría.');
    }

    const limitNum = Math.min(Number(limite) || 100, 500);

    let query = `
      SELECT b.id_bitacora, b.id_usuario, b.nombre_usuario, b.modulo, b.accion, b.descripcion, b.created_at,
             u.rol AS usuario_rol
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

    query += ` ORDER BY b.id_bitacora DESC LIMIT $${paramIndex};`;
    params.push(limitNum);

    const result = await pool.query(query, params);

    return {
      total: result.rowCount || 0,
      registros: result.rows
    };
  }
}
