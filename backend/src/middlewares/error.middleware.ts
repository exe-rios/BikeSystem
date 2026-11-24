import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { escribirLog } from '../utils/logger.js';
import type { PeticionConUsuario } from './auth.middleware.js';

/** Middleware global para captura y formateo estándar de errores operacionales y de base de datos. */
export const manejarErrores = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }

  // 1. Error operacional conocido (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      detalles: err.details
    });
    return;
  }

  // 1b. Errores de parsing JSON, payload excedido o política CORS
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'El formato JSON de la solicitud es inválido.'
    });
    return;
  }

  if (err?.type === 'entity.too.large') {
    res.status(413).json({
      error: 'El contenido enviado excede el tamaño máximo permitido.'
    });
    return;
  }

  if (err?.message === 'Bloqueado por política CORS') {
    res.status(403).json({
      error: 'Origen no autorizado por política CORS.'
    });
    return;
  }

  // 2. Errores de PostgreSQL
  const pgCode = err?.code;

  if (pgCode === '23505') { // Unicidad duplicada
    res.status(409).json({
      error: 'Ya existe un registro con esos datos.'
    });
    return;
  }

  if (pgCode === '23503') { // Clave foránea violada
    res.status(400).json({
      error: 'No se puede eliminar porque tiene datos relacionados.'
    });
    return;
  }

  if (pgCode === '22P02') { // Sintaxis no válida (ej. casting numérico inválido)
    res.status(400).json({
      error: 'Los datos enviados no son válidos. Revisá los campos.'
    });
    return;
  }

  if (pgCode === '22007' || pgCode === '22008') { // Fecha o rango datetime inválido
    res.status(400).json({
      error: 'La fecha proporcionada no es válida.'
    });
    return;
  }

  if (pgCode === '22003') { // Numeric field overflow
    res.status(400).json({
      error: 'El importe o número ingresado excede el límite máximo permitido ($99.999.999,99).'
    });
    return;
  }

  if (pgCode === '22001') { // String data right truncation
    res.status(400).json({
      error: 'Uno o más campos de texto superan la cantidad máxima de caracteres permitida.'
    });
    return;
  }

  if (pgCode === '23514') { // Check constraint violation
    res.status(400).json({
      error: 'Uno o más campos no cumplen con el formato o los requisitos mínimos exigidos.'
    });
    return;
  }

  // 3. Error no controlado
  console.error('[UNHANDLED SERVER ERROR]:', err);
  escribirLog('ERROR', 'HTTP', `${req.method} ${req.originalUrl || req.url} -> 500`, err, {
    usuario: (req as PeticionConUsuario).usuarioToken?.nombre_usuario || null
  });
  res.status(500).json({
    error: 'Ocurrió un error inesperado. Intentá de nuevo.'
  });
};
