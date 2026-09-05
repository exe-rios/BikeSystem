import type { Response, NextFunction } from 'express';
import type { PeticionConUsuario } from './auth.middleware.js';

/**
 * Middleware de autorización por roles.
 * Debe usarse DESPUÉS de verificarToken para que req.usuarioToken esté disponible.
 *
 * Ejemplo de uso en rutas:
 *   router.get('/', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), controlador);
 */
export const autorizarRoles = (...rolesPermitidos: string[]) => {
  return (req: PeticionConUsuario, res: Response, next: NextFunction): void => {
    const rolUsuario = req.usuarioToken?.rol;

    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      res.status(403).json({
        error: 'No tenés permisos para hacer esto.'
      });
      return;
    }

    next();
  };
};
