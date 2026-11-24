import type { Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { BadRequestError, ForbiddenError } from '../utils/errors.js';
import { responderOk } from '../utils/response.js';
import { escribirLog, leerUltimasLineasLog, obtenerArchivoLogDescarga, type NivelLog } from '../utils/logger.js';
import { LogSistemaService } from '../services/logSistema.service.js';

/** Garantiza que únicamente usuarios con rol SUPERADMIN accedan a los logs técnicos. */
function exigirSuperadmin(req: PeticionConUsuario): void {
  const rol = (req.usuarioToken?.rol || '').toUpperCase();
  if (rol !== 'SUPERADMIN') {
    throw new ForbiddenError('Acceso restringido exclusivamente a SUPERADMIN.');
  }
}

/** Endpoint POST /api/logs/cliente: Registra errores no controlados de interfaz enviados por clientes autenticados. */
export const reportarErrorCliente = async (
  req: PeticionConUsuario,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mensaje, detalle, nivel } = (req.body || {}) as {
      mensaje?: unknown;
      detalle?: unknown;
      nivel?: unknown;
    };

    if (typeof mensaje !== 'string' || !mensaje.trim()) {
      throw new BadRequestError('El campo "mensaje" es obligatorio.');
    }

    const nivelStr = typeof nivel === 'string' ? nivel.trim().toUpperCase() : 'ERROR';
    const nivelNorm: NivelLog = nivelStr === 'WARN' ? 'WARN' : 'ERROR';
    const detalleStr =
      typeof detalle === 'string' && detalle.trim() ? detalle.trim().slice(0, 2500) : undefined;

    escribirLog(nivelNorm, 'FRONTEND', mensaje.trim().slice(0, 500), detalleStr, {
      usuario: req.usuarioToken?.nombre_usuario || null,
      enviarRemoto: true
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/logs: Retorna las últimas líneas del archivo local bikesystem.log. */
export const obtenerLogsSistema = async (
  req: PeticionConUsuario,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    exigirSuperadmin(req);

    const rawLineas = Number(req.query.lineas);
    const lineas = Number.isFinite(rawLineas) ? Math.max(1, Math.min(1000, Math.trunc(rawLineas))) : 250;

    responderOk(res, leerUltimasLineasLog(lineas));
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/logs/descargar: Descarga el archivo local bikesystem.log como texto plano. */
export const descargarLogsSistema = async (
  req: PeticionConUsuario,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    exigirSuperadmin(req);

    const { contenido, nombreArchivo, tamanoBytes } = obtenerArchivoLogDescarga();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', tamanoBytes);

    res.status(200).send(contenido);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/logs/remotos: Consulta logs centralizados en Supabase de todas las PCs. */
export const obtenerLogsRemotos = async (
  req: PeticionConUsuario,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    exigirSuperadmin(req);

    const limiteRaw = Number(req.query.limite);
    const limite = Number.isFinite(limiteRaw) ? Math.max(1, Math.min(500, Math.trunc(limiteRaw))) : 200;
    const nivel = typeof req.query.nivel === 'string' ? req.query.nivel : undefined;
    const equipo = typeof req.query.equipo === 'string' ? req.query.equipo : undefined;
    const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda : undefined;

    const resultado = await LogSistemaService.obtenerLogsRemotos({
      limite,
      nivel,
      equipo,
      busqueda
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/logs/remotos/descargar: Descarga los logs remotos de Supabase en formato .log. */
export const descargarLogsRemotos = async (
  req: PeticionConUsuario,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    exigirSuperadmin(req);

    const nivel = typeof req.query.nivel === 'string' ? req.query.nivel : undefined;
    const equipo = typeof req.query.equipo === 'string' ? req.query.equipo : undefined;

    const { contenido, nombreArchivo, tamanoBytes } = await LogSistemaService.generarTextoDescargaRemotos({
      nivel,
      equipo
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', tamanoBytes);

    res.status(200).send(contenido);
  } catch (error) {
    next(error);
  }
};
