import { Router } from 'express';
import { obtenerBitacora } from '../controllers/bitacora.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas de auditoría y bitácora del sistema (exclusivo administradores). */
const router: ReturnType<typeof Router> = Router();

router.get('/', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), obtenerBitacora);

export default router;
