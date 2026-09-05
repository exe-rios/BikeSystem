import { Router } from 'express';
import { 
    agregarRepuesto, 
    obtenerRepuestosDeReparacion,
    eliminarRepuesto 
} from '../controllers/detalleReparacion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, agregarRepuesto);
router.get('/:id_reparacion', verificarToken, obtenerRepuestosDeReparacion);
router.delete('/:id_detalle_rep', verificarToken, eliminarRepuesto);

export default router;