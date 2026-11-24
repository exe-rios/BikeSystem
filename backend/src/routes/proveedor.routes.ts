import { Router } from 'express';
import { 
    crearProveedor, 
    obtenerProveedores, 
    obtenerProveedorPorId, 
    actualizarProveedor, 
    eliminarProveedor,
    actualizarCotizacionProveedor
} from '../controllers/proveedor.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para la administración de proveedores comerciales. */
const router: ReturnType<typeof Router> = Router();

// Gestión de proveedores (Consulta de catálogo abierta a empleados; mutaciones exclusivas Administradores)
router.use(verificarToken);

router.get('/', autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerProveedores);
router.post('/', autorizarRoles('ADMIN', 'SUPERADMIN'), crearProveedor);
router.get('/:id', autorizarRoles('ADMIN', 'SUPERADMIN'), obtenerProveedorPorId);
router.put('/:id', autorizarRoles('ADMIN', 'SUPERADMIN'), actualizarProveedor);
router.put('/:id/dolar', autorizarRoles('ADMIN', 'SUPERADMIN'), actualizarCotizacionProveedor);
router.delete('/:id', autorizarRoles('ADMIN', 'SUPERADMIN'), eliminarProveedor);

export default router;