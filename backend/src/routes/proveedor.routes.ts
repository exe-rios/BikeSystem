import { Router } from 'express';
import { 
    crearProveedor, 
    obtenerProveedores, 
    obtenerProveedorPorId, 
    actualizarProveedor, 
    eliminarProveedor 
} from '../controllers/proveedor.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, crearProveedor);
router.get('/', verificarToken, obtenerProveedores);
router.get('/:id', verificarToken, obtenerProveedorPorId);
router.put('/:id', verificarToken, actualizarProveedor);
router.delete('/:id', verificarToken, eliminarProveedor);

export default router;