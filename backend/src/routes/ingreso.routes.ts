import { Router } from 'express';
import { 
    registrarIngresoStock, 
    obtenerIngresosStock,
    obtenerIngresoPorId
} from '../controllers/ingreso.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, registrarIngresoStock);
router.get('/', verificarToken, obtenerIngresosStock);
router.get('/:id', verificarToken, obtenerIngresoPorId);

export default router;