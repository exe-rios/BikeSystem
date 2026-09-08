import { Router } from 'express';
import { 
    crearReparacion,
    obtenerReparaciones, 
    obtenerReparacionPorId, 
    actualizarEstadoReparacion 
} from '../controllers/reparacion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para el flujo de trabajo de reparaciones en taller. */
const router: ReturnType<typeof Router> = Router();

// Operaciones de taller (Mecánicos, Empleados y Administradores)
router.post('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), crearReparacion);
router.get('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerReparaciones);
router.get('/:id', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerReparacionPorId);
router.put('/:id', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), actualizarEstadoReparacion);

export default router;