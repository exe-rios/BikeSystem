import { Router } from 'express';
import { descargarRespaldoSQL } from '../controllers/backup.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para la gestión de copias de seguridad de la base de datos (RNF3). */
const router: ReturnType<typeof Router> = Router();

// Todas las operaciones de respaldo requieren autenticación y rol administrativo
router.use(verificarToken);

// GET /api/backup/descargar - Genera y descarga el archivo SQL de respaldo
router.get('/descargar', autorizarRoles('ADMIN', 'SUPERADMIN'), descargarRespaldoSQL);

export default router;
