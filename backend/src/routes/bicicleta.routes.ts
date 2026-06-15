import { Router } from 'express';
import { 
    crearBicicleta, 
    obtenerBicicletas, 
    obtenerBicicletaPorId, 
    actualizarBicicleta, 
    eliminarBicicleta 
} from '../controllers/bicicleta.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, crearBicicleta);
router.get('/', verificarToken, obtenerBicicletas);
router.get('/:id', verificarToken, obtenerBicicletaPorId);
router.put('/:id', verificarToken, actualizarBicicleta);
router.delete('/:id', verificarToken, eliminarBicicleta);

export default router;