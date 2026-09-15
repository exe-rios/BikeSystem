import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { responderOk } from '../utils/response.js';

/** Endpoint POST /api/login: Autentica credenciales y emite token JWT. */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre_usuario, contrasena } = req.body;
    const resultado = await AuthService.login(nombre_usuario, contrasena);
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/health: Comprobación rápida de disponibilidad del servidor. */
export const healthCheck = (_req: Request, res: Response): void => {
  responderOk(res, { status: 'ok', message: 'BikeSystem API esta corriendo' });
};

/** Endpoint GET /api/db-test: Comprueba la conexión activa con PostgreSQL. */
export const dbTest = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resultado = await AuthService.testDatabase();
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};
