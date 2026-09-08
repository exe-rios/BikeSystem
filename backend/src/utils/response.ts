import type { Request, Response, NextFunction } from 'express';

/**
 * Envía una respuesta HTTP exitosa (200 por defecto).
 */
export const responderOk = <T>(res: Response, data: T, statusCode = 200): void => {
  res.status(statusCode).json(data);
};

/**
 * Envía una respuesta HTTP 201 Created estandarizada con mensaje y datos adjuntos opcionales.
 */
export const responderCreado = <T extends object>(res: Response, mensaje: string, data?: T): void => {
  res.status(201).json({
    message: mensaje,
    ...(data || {})
  });
};

/**
 * Envoltorio para controladores asíncronos que captura excepciones y las redirige al middleware de errores.
 */
export const controladorAsync = <Req = Request, Res = Response>(
  fn: (req: Req, res: Res, next: NextFunction) => Promise<any>
) => {
  return (req: Req, res: Res, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
