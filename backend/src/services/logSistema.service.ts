import { pool } from '../config/db.js';
import { sanitizarTextoLog, type EntradaLogRemoto, type NivelLog } from '../utils/logger.js';

export interface LogSistemaRegistro {
  id_log: number;
  nivel: NivelLog;
  origen: string;
  equipo: string;
  usuario: string | null;
  mensaje: string;
  detalle: string | null;
  created_at: string;
}

const MAX_LOGS_REMOTOS = 500;
const NIVELES_VALIDOS = new Set<string>(['INFO', 'WARN', 'ERROR']);

/** Formatea una fecha UTC/ISO en horario legible de Argentina para archivos descargables. */
function formatearFechaArgentinaDescarga(valor: string | Date): string {
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d);
}

/** Servicio de diagnóstico remoto centralizado en Supabase (visible únicamente para SUPERADMIN). */
export class LogSistemaService {
  /** Inserta un evento sanitizado en Log_Sistema y aplica retención automática de los últimos 500 registros. */
  static async guardarLogRemoto(entrada: EntradaLogRemoto): Promise<void> {
    const nivel: NivelLog = NIVELES_VALIDOS.has(entrada.nivel) ? entrada.nivel : 'ERROR';
    const origen = String(entrada.origen || 'APP').trim().toUpperCase().slice(0, 40) || 'APP';
    const equipo = String(entrada.equipo || 'desconocido').trim().slice(0, 100) || 'desconocido';
    const usuario = entrada.usuario ? String(entrada.usuario).trim().slice(0, 60) : null;
    const mensaje = sanitizarTextoLog(String(entrada.mensaje || '')).trim().slice(0, 1000) || '(sin mensaje)';
    const detalle = entrada.detalle
      ? sanitizarTextoLog(String(entrada.detalle)).trim().slice(0, 2500) || null
      : null;

    const resInsert = await pool.query(
      `INSERT INTO Log_Sistema (nivel, origen, equipo, usuario, mensaje, detalle)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_log;`,
      [nivel, origen, equipo, usuario, mensaje, detalle]
    );

    const idLog = Number(resInsert.rows[0]?.id_log);
    if (Number.isInteger(idLog) && idLog > MAX_LOGS_REMOTOS && idLog % 25 === 0) {
      await pool.query(
        `DELETE FROM Log_Sistema
         WHERE id_log NOT IN (
           SELECT id_log FROM Log_Sistema ORDER BY id_log DESC LIMIT $1
         );`,
        [MAX_LOGS_REMOTOS]
      );
    }
  }

  /** Consulta registros remotos con filtros opcionales por nivel, equipo y texto libre. */
  static async obtenerLogsRemotos(filtros: {
    limite?: number | undefined;
    nivel?: string | undefined;
    equipo?: string | undefined;
    busqueda?: string | undefined;
  }): Promise<{ total: number; equipos: string[]; registros: LogSistemaRegistro[] }> {
    const limiteRaw = Number(filtros.limite);
    const limite = Number.isFinite(limiteRaw) ? Math.max(1, Math.min(500, Math.trunc(limiteRaw))) : 200;

    const condiciones: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const nivelNorm = String(filtros.nivel || '').trim().toUpperCase();
    if (NIVELES_VALIDOS.has(nivelNorm)) {
      condiciones.push(`nivel = $${idx++}`);
      params.push(nivelNorm);
    }

    const equipoNorm = String(filtros.equipo || '').trim();
    if (equipoNorm && equipoNorm.toUpperCase() !== 'TODOS') {
      condiciones.push(`equipo = $${idx++}`);
      params.push(equipoNorm);
    }

    const busquedaNorm = String(filtros.busqueda || '').trim();
    if (busquedaNorm) {
      condiciones.push(
        `(mensaje ILIKE $${idx} OR COALESCE(detalle, '') ILIKE $${idx} OR origen ILIKE $${idx} OR equipo ILIKE $${idx} OR COALESCE(usuario, '') ILIKE $${idx})`
      );
      params.push(`%${busquedaNorm}%`);
      idx++;
    }

    const whereSQL = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const queryRegistros = `
      SELECT id_log, nivel, origen, equipo, usuario, mensaje, detalle, created_at
      FROM Log_Sistema
      ${whereSQL}
      ORDER BY id_log DESC
      LIMIT $${idx};
    `;
    const queryTotal = `SELECT COUNT(*)::INT AS total FROM Log_Sistema ${whereSQL};`;
    const queryEquipos = `SELECT DISTINCT equipo FROM Log_Sistema ORDER BY equipo ASC;`;

    const [resRegistros, resTotal, resEquipos] = await Promise.all([
      pool.query(queryRegistros, [...params, limite]),
      pool.query(queryTotal, params),
      pool.query(queryEquipos)
    ]);

    return {
      total: Number(resTotal.rows[0]?.total ?? 0),
      equipos: (resEquipos.rows || [])
        .map((r: { equipo?: string }) => String(r.equipo || '').trim())
        .filter(Boolean),
      registros: (resRegistros.rows || []) as LogSistemaRegistro[]
    };
  }

  /** Exporta hasta 500 registros remotos formateados como archivo .log descargable. */
  static async generarTextoDescargaRemotos(filtros?: {
    nivel?: string | undefined;
    equipo?: string | undefined;
  }): Promise<{ contenido: string; nombreArchivo: string; tamanoBytes: number }> {
    const { registros } = await LogSistemaService.obtenerLogsRemotos({
      limite: 500,
      nivel: filtros?.nivel,
      equipo: filtros?.equipo
    });

    const ahora = formatearFechaArgentinaDescarga(new Date());
    const nombreArchivo = `Logs_Remotos_BikeSystem_${ahora.slice(0, 10)}_${ahora.slice(11, 13)}-${ahora.slice(14, 16)}.log`;

    if (registros.length === 0) {
      const contenido = '-- Sin registros remotos en Log_Sistema con los filtros seleccionados --\n';
      return {
        contenido,
        nombreArchivo,
        tamanoBytes: Buffer.byteLength(contenido, 'utf8')
      };
    }

    const lineas = registros.map((r) => {
      const ts = formatearFechaArgentinaDescarga(r.created_at);
      const userPart = r.usuario ? ` (${r.usuario})` : '';
      const detallePart = r.detalle ? ` | ${r.detalle.replace(/\r?\n/g, ' \\n ')}` : '';
      return `[${ts}] [${r.nivel}] [${r.equipo}] [${r.origen}]${userPart} ${r.mensaje}${detallePart}`;
    });

    const contenido = lineas.join('\n') + '\n';
    return {
      contenido,
      nombreArchivo,
      tamanoBytes: Buffer.byteLength(contenido, 'utf8')
    };
  }
}
