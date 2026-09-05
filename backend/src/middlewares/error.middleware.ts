import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

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

  // 3. Error no controlado
  console.error('[UNHANDLED SERVER ERROR]:', err);
  res.status(500).json({
    error: 'Ocurrió un error inesperado. Intentá de nuevo.'
  });
};
