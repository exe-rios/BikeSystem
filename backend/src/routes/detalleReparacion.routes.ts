import { Router } from 'express';
import { 
    agregarRepuesto, 
    obtenerRepuestosDeReparacion,
    eliminarRepuesto 
} from '../controllers/detalleReparacion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para asignación y consumo de repuestos en órdenes de taller. */
const router: ReturnType<typeof Router> = Router();

// Gestión de repuestos en taller (Mecánicos, Empleados y Administradores)
router.post('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), agregarRepuesto);
router.get('/:id_reparacion', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerRepuestosDeReparacion);
router.delete('/:id_detalle_rep', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), eliminarRepuesto);

export default router;