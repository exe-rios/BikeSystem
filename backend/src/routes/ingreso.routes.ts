import { Router } from 'express';
import { registrarIngresoStock, obtenerIngresosStock } from '../controllers/ingreso.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, registrarIngresoStock);
router.get('/', verificarToken, obtenerIngresosStock);

export default router;