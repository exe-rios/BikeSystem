import { Router } from 'express';
import { login, healthCheck, dbTest } from '../controllers/auth.controller.js';
import { loginLimiter } from '../middlewares/rateLimit.middleware.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// Rutas de autenticación y diagnóstico
router.get('/health', healthCheck);
router.get('/db-test', verificarToken, dbTest);
router.post('/login', loginLimiter, login);

export default router;