import { Router } from 'express';
import { 
    crearBicicleta, 
    obtenerBicicletas, 
    obtenerBicicletaPorId, 
    actualizarBicicleta, 
    eliminarBicicleta,
    obtenerHistorialBicicleta
} from '../controllers/bicicleta.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para la gestión de bicicletas de clientes e historial de taller. */
const router: ReturnType<typeof Router> = Router();

// Gestión diaria de bicicletas de clientes (Empleados y Administradores)
router.post('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), crearBicicleta);
router.get('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerBicicletas);
router.get('/:id/historial', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerHistorialBicicleta);
router.get('/:id', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerBicicletaPorId);
router.put('/:id', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), actualizarBicicleta);

// Baja de bicicleta (Exclusivo Administradores)
router.delete('/:id', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), eliminarBicicleta);

export default router;