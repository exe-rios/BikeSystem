import { Router } from 'express';
import { obtenerBitacora } from '../controllers/bitacora.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.get('/', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), obtenerBitacora);

export default router;
