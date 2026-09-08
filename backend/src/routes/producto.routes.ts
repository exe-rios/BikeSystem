import { Router } from 'express';
import { 
    crearProducto, 
    obtenerProductos, 
    obtenerProductoPorId, 
    actualizarProducto, 
    eliminarProducto,
    reactivarProducto,
    registrarMovimientoStock,
    obtenerMovimientosStock
} from '../controllers/producto.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas de inventario, catálogo de productos y auditoría Kardex. */
const router: ReturnType<typeof Router> = Router();

// Consultas y Movimientos / Ajustes (Empleados y Administradores)
router.get('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerProductos);
router.get('/movimientos', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerMovimientosStock);
router.post('/movimientos', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), registrarMovimientoStock);
router.get('/:id/movimientos', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerMovimientosStock);
router.get('/:id', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerProductoPorId);

// Gestión estructural de catálogo (Exclusivo Administradores)
router.post('/', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), crearProducto);
router.put('/:id', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), actualizarProducto);
router.delete('/:id', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), eliminarProducto);
router.put('/:id/reactivar', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), reactivarProducto);
router.patch('/:id/reactivar', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), reactivarProducto);

export default router;

