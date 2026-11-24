import { Router } from 'express';
import { login, healthCheck, dbTest } from '../controllers/auth.controller.js';
import { loginLimiter } from '../middlewares/rateLimit.middleware.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para autenticación de usuarios y diagnóstico del servidor. */
const router: ReturnType<typeof Router> = Router();

// Rutas de autenticación y diagnóstico
router.get('/health', healthCheck);
router.get('/db-test', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), dbTest);
router.post('/login', loginLimiter, login);

export default router;