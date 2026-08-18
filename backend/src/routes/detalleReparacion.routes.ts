import { Router } from 'express';
import { agregarRepuesto, obtenerRepuestosDeReparacion } from '../controllers/detalleReparacion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, agregarRepuesto);
router.get('/:id_reparacion', verificarToken, obtenerRepuestosDeReparacion);

export default router;