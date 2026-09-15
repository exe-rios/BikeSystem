import { Router } from 'express';
import { 
    crearProveedor, 
    obtenerProveedores, 
    obtenerProveedorPorId, 
    actualizarProveedor, 
    eliminarProveedor 
} from '../controllers/proveedor.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para la administración de proveedores comerciales. */
const router: ReturnType<typeof Router> = Router();

// Gestión de proveedores (Exclusivo Administradores)
router.use(verificarToken);
router.use(autorizarRoles('ADMIN', 'SUPERADMIN'));

router.post('/', crearProveedor);
router.get('/', obtenerProveedores);
router.get('/:id', obtenerProveedorPorId);
router.put('/:id', actualizarProveedor);
router.delete('/:id', eliminarProveedor);

export default router;