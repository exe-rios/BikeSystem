import { Router } from 'express';
import { 
    crearReparacion,
    obtenerReparaciones, 
    obtenerReparacionPorId, 
    actualizarEstadoReparacion 
} from '../controllers/reparacion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, crearReparacion);
router.get('/', verificarToken, obtenerReparaciones);
router.get('/:id', verificarToken, obtenerReparacionPorId);
router.put('/:id', verificarToken, actualizarEstadoReparacion);

export default router;