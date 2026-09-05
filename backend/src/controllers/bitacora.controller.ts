import type { Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { BitacoraService } from '../services/bitacora.service.js';

export const obtenerBitacora = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { modulo, busqueda, limite } = req.query as { modulo?: string; busqueda?: string; limite?: string };
    const resultado = await BitacoraService.obtenerBitacora({
      modulo,
      busqueda,
      limite,
      rolUsuario: req.usuarioToken?.rol
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};
