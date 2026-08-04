import { Router } from 'express';
import { obtenerDashboard } from '../controllers/reporte.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// GET /api/reportes/dashboard
router.get('/dashboard', verificarToken, obtenerDashboard);

export default router;