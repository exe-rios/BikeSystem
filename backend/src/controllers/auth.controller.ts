import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre_usuario, contrasena } = req.body;
    const resultado = await AuthService.login(nombre_usuario, contrasena);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const healthCheck = (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', message: 'BikeSystem API esta corriendo' });
};

export const dbTest = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resultado = await AuthService.testDatabase();
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};
