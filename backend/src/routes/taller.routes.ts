import { Router } from 'express';
import { crearReparacion, obtenerReparaciones } from '../controllers/reparacion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, crearReparacion);
router.get('/', verificarToken, obtenerReparaciones);

export default router;