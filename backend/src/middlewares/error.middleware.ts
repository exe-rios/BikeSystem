import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

/** Middleware global para captura y formateo estándar de errores operacionales y de base de datos. */
export const manejarErrores = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Error operacional conocido (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      detalles: err.details
    });
    return;
  }

  // 2. Errores de PostgreSQL
  if (err.code === '23505') { // Unicidad duplicada
    res.status(409).json({
      error: 'Ya existe un registro con esos datos.'
    });
    return;
  }

  if (err.code === '23503') { // Clave foránea violada
    res.status(400).json({
      error: 'No se puede eliminar porque tiene datos relacionados.'
    });
    return;
  }

  if (err.code === '22P02') { // Sintaxis no válida (ej. casting numérico inválido)
    res.status(400).json({
      error: 'Los datos enviados no son válidos. Revisá los campos.'
    });
    return;
  }

  if (err.code === '22003') { // Numeric field overflow
    res.status(400).json({
      error: 'El importe o número ingresado excede el límite máximo permitido ($99.999.999,99).'
    });
    return;
  }

  if (err.code === '22001') { // String data right truncation
    res.status(400).json({
      error: 'Uno o más campos de texto superan la cantidad máxima de caracteres permitida.'
    });
    return;
  }

  if (err.code === '23514') { // Check constraint violation
    res.status(400).json({
      error: 'Uno o más campos no cumplen con el formato o los requisitos mínimos exigidos.'
    });
    return;
  }

  // 3. Error no controlado
  console.error('[UNHANDLED SERVER ERROR]:', err);
  res.status(500).json({
    error: 'Ocurrió un error inesperado. Intentá de nuevo.'
  });
};
