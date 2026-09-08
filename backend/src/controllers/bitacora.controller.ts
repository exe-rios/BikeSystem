import type { Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { BitacoraService } from '../services/bitacora.service.js';
import { responderOk } from '../utils/response.js';

/** Endpoint GET /api/bitacora: Consulta paginada del log de auditoría (exclusivo administradores). */
export const obtenerBitacora = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { modulo, busqueda, limite, pagina } = req.query as {
      modulo?: string;
      busqueda?: string;
      limite?: string;
      pagina?: string;
    };
    const resultado = await BitacoraService.obtenerBitacora({
      modulo,
      busqueda,
      limite,
      pagina,
      rolUsuario: req.usuarioToken?.rol
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};
