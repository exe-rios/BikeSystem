import type { Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { BackupService } from '../services/backup.service.js';

/**
 * Controlador para la descarga de copias de seguridad de la base de datos (RNF3).
 */
export const descargarRespaldoSQL = async (
  req: PeticionConUsuario,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const usuario = req.usuarioToken
      ? {
          id_usuario: req.usuarioToken.id,
          nombre_usuario: req.usuarioToken.nombre_usuario || 'admin'
        }
      : undefined;

    const { contenidoSQL, nombreArchivo } = await BackupService.generarRespaldoSQL(usuario);

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Content-Length', Buffer.byteLength(contenidoSQL, 'utf-8'));

    res.status(200).send(contenidoSQL);
  } catch (error) {
    next(error);
  }
};
