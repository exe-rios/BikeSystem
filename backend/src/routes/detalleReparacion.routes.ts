import { Router } from 'express';
import { agregarRepuesto } from '../controllers/detalleReparacion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// Usamos POST porque estamos creando un nuevo registro de detalle
router.post('/', verificarToken, agregarRepuesto);

export default router;