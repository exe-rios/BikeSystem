import { Router } from 'express';
import { 
    crearProducto, 
    obtenerProductos, 
    obtenerProductoPorId, 
    actualizarProducto, 
    eliminarProducto,
    reactivarProducto
} from '../controllers/producto.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, crearProducto);
router.get('/', verificarToken, obtenerProductos);
router.get('/:id', verificarToken, obtenerProductoPorId);
router.put('/:id', verificarToken, actualizarProducto);
router.delete('/:id', verificarToken, eliminarProducto);
router.put('/:id/reactivar', verificarToken, reactivarProducto);
router.patch('/:id/reactivar', verificarToken, reactivarProducto);

export default router;

