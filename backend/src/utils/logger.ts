import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type NivelLog = 'INFO' | 'WARN' | 'ERROR';

export interface EntradaLogRemoto {
  nivel: NivelLog;
  origen: string;
  equipo: string;
  usuario?: string | null | undefined;
  mensaje: string;
  detalle?: string | null | undefined;
}

export type PersistenciaLogRemoto = (entrada: EntradaLogRemoto) => Promise<void>;

export const MAX_LOG_BYTES = 2 * 1024 * 1024; // 2 MB

const TIMEZONE_ARGENTINA = 'America/Argentina/Buenos_Aires';

let persistenciaRemota: PersistenciaLogRemoto | null = null;
let enEscrituraRemota = false;

/** Registra el adaptador de persistencia remota (p. ej. Supabase) sin acoplar db.ts al logger. */
export function registrarPersistenciaLogRemoto(fn: PersistenciaLogRemoto | null): void {
  persistenciaRemota = fn;
}

/** Retorna el nombre del equipo actual acotado para identificar la PC en logs remotos. */
export function obtenerNombreEquipo(): string {
  try {
    return (os.hostname() || 'desconocido').trim().slice(0, 100) || 'desconocido';
  } catch {
    return 'desconocido';
  }
}

/** Obtiene el directorio donde se persisten los logs técnicos del sistema. */
export function obtenerDirectorioLogs(): string {
  const envDir = process.env.LOG_DIR?.trim();
  return envDir ? path.resolve(envDir) : path.resolve(process.cwd(), 'logs');
}

/** Obtiene la ruta completa del archivo principal de log. */
export function obtenerRutaArchivoLog(): string {
  return path.join(obtenerDirectorioLogs(), 'bikesystem.log');
}

/** Formatea una fecha en horario de Argentina (YYYY-MM-DD HH:mm:ss). */
function formatearTimestampArgentina(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIMEZONE_ARGENTINA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(fecha);
}

/** Formatea una fecha para nombres de archivo (YYYY-MM-DD_HH-mm). */
function formatearTimestampArchivo(fecha: Date = new Date()): string {
  const base = formatearTimestampArgentina(fecha); // YYYY-MM-DD HH:mm:ss
  return `${base.slice(0, 10)}_${base.slice(11, 13)}-${base.slice(14, 16)}`;
}

/** Redacta credenciales, URLs de conexión y tokens antes de escribir o exponer logs. */
export function sanitizarTextoLog(texto: string): string {
  if (!texto) return '';
  let limpio = String(texto);

  const secretos = [process.env.DATABASE_URL, process.env.JWT_SECRET];
  for (const secreto of secretos) {
    if (secreto && secreto.length >= 6 && limpio.includes(secreto)) {
      limpio = limpio.split(secreto).join('[REDACTED]');
    }
  }

  limpio = limpio
    .replace(/postgres(?:ql)?:\/\/([^:\s/]+):([^@\s]+)@/gi, 'postgresql://***:***@')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\b(JWT_SECRET|DATABASE_URL)\s*=\s*([^\s"'`;]+)/gi, '$1=[REDACTED]')
    .replace(/(["']?(?:contrasena|password|token)["']?\s*:\s*)(["'])(?:\\.|(?!\2).)*\2/gi, '$1"[REDACTED]"');

  return limpio;
}

/** Rota bikesystem.log -> bikesystem.1.log cuando supera el límite indicado. */
export function rotarLogSiCorresponde(rutaArchivo: string, maxBytes: number = MAX_LOG_BYTES): void {
  if (!fs.existsSync(rutaArchivo)) return;

  const stat = fs.statSync(rutaArchivo);
  if (stat.size < maxBytes) return;

  const dir = path.dirname(rutaArchivo);
  const ext = path.extname(rutaArchivo) || '.log';
  const base = path.basename(rutaArchivo, ext);
  const rutaRotada = path.join(dir, `${base}.1${ext}`);

  if (fs.existsSync(rutaRotada)) {
    fs.rmSync(rutaRotada, { force: true });
  }
  fs.renameSync(rutaArchivo, rutaRotada);
}

/** Serializa detalles adicionales (Error u objetos) de forma segura y acotada. */
function serializarDetalle(detalle: unknown): string {
  if (detalle === undefined || detalle === null) return '';

  if (detalle instanceof Error) {
    const base = detalle.stack || `${detalle.name}: ${detalle.message}`;
    return base.slice(0, 2000);
  }

  if (typeof detalle === 'string') {
    return detalle.slice(0, 2000);
  }

  try {
    return JSON.stringify(detalle).slice(0, 2000);
  } catch {
    return String(detalle).slice(0, 2000);
  }
}

export interface OpcionesEscribirLog {
  usuario?: string | null | undefined;
  omitirRemoto?: boolean | undefined;
  enviarRemoto?: boolean | undefined;
}

/** Escribe una entrada sanitizada en bikesystem.log y opcionalmente la replica al almacenamiento remoto. */
export function escribirLog(
  nivel: NivelLog,
  origen: string,
  mensaje: string,
  detalle?: unknown,
  opciones?: OpcionesEscribirLog
): void {
  const origenSeguro = String(origen || 'APP').trim().toUpperCase().slice(0, 32);
  const msgSeguro = sanitizarTextoLog(mensaje).replace(/\r?\n/g, ' ').trim();
  const detalleRaw = serializarDetalle(detalle);
  const detalleSanitizado = detalleRaw ? sanitizarTextoLog(detalleRaw) : '';
  const usuarioSeguro = opciones?.usuario?.trim().slice(0, 60) || null;

  try {
    const dir = obtenerDirectorioLogs();
    fs.mkdirSync(dir, { recursive: true });

    const rutaArchivo = obtenerRutaArchivoLog();
    rotarLogSiCorresponde(rutaArchivo, MAX_LOG_BYTES);

    const ts = formatearTimestampArgentina();
    const detalleLinea = detalleSanitizado
      ? ` | ${detalleSanitizado.replace(/\r?\n/g, ' \\n ')}`
      : '';
    const usuarioPrefijo = usuarioSeguro ? ` (${usuarioSeguro})` : '';

    const linea = `[${ts}] [${nivel}] [${origenSeguro}]${usuarioPrefijo} ${msgSeguro}${detalleLinea}\n`;
    fs.appendFileSync(rutaArchivo, linea, 'utf8');
  } catch {
    // Un fallo al persistir logs en disco nunca debe interrumpir el servidor HTTP
  }

  const debeEnviarRemoto =
    !opciones?.omitirRemoto &&
    (opciones?.enviarRemoto === true || nivel === 'ERROR' || nivel === 'WARN' || origenSeguro === 'SERVER');

  if (persistenciaRemota && debeEnviarRemoto && !enEscrituraRemota) {
    enEscrituraRemota = true;
    void persistenciaRemota({
      nivel,
      origen: origenSeguro,
      equipo: obtenerNombreEquipo(),
      usuario: usuarioSeguro,
      mensaje: msgSeguro,
      detalle: detalleSanitizado || null
    })
      .catch(() => {})
      .finally(() => {
        enEscrituraRemota = false;
      });
  }
}

export interface LecturaLogsResult {
  existe: boolean;
  archivo: string;
  tamanoBytes: number;
  totalLineas: number;
  lineas: string[];
}

/** Lee las últimas líneas de bikesystem.log (entre 1 y 1000). */
export function leerUltimasLineasLog(maxLineas: number = 250): LecturaLogsResult {
  const limite = Math.max(1, Math.min(1000, Math.trunc(Number(maxLineas) || 250)));
  const rutaArchivo = obtenerRutaArchivoLog();

  if (!fs.existsSync(rutaArchivo)) {
    return {
      existe: false,
      archivo: rutaArchivo,
      tamanoBytes: 0,
      totalLineas: 0,
      lineas: []
    };
  }

  const stat = fs.statSync(rutaArchivo);
  const contenido = fs.readFileSync(rutaArchivo, 'utf8');
  const todas = contenido.split(/\r?\n/).filter((l) => l.length > 0);
  const recortadas = todas.slice(-limite);

  return {
    existe: true,
    archivo: rutaArchivo,
    tamanoBytes: stat.size,
    totalLineas: todas.length,
    lineas: recortadas
  };
}

/** Prepara el contenido completo del log principal para descarga como archivo .log. */
export function obtenerArchivoLogDescarga(): {
  existe: boolean;
  contenido: string;
  nombreArchivo: string;
  tamanoBytes: number;
} {
  const rutaArchivo = obtenerRutaArchivoLog();
  const nombreArchivo = `Logs_BikeSystem_${formatearTimestampArchivo()}.log`;

  if (!fs.existsSync(rutaArchivo)) {
    const contenido = '-- Sin registros de log aún --\n';
    return {
      existe: false,
      contenido,
      nombreArchivo,
      tamanoBytes: Buffer.byteLength(contenido, 'utf8')
    };
  }

  const contenido = fs.readFileSync(rutaArchivo, 'utf8');
  return {
    existe: true,
    contenido,
    nombreArchivo,
    tamanoBytes: Buffer.byteLength(contenido, 'utf8')
  };
}
