import { Router } from 'express';
import { 
    crearVenta, 
    agregarDetalleVenta, 
    obtenerVentas, 
    obtenerVentaPorId,
    obtenerGarantiasBicicletas,
    obtenerMetodosPago,
    anularVenta
} from '../controllers/venta.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para facturación comercial, garantías y detalles de venta. */
const router: ReturnType<typeof Router> = Router();

// Operaciones de mostrador y consulta (Empleados y Administradores)
router.post('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), crearVenta);
router.get('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerVentas);
router.get('/metodos-pago', verificarToken, obtenerMetodosPago);
router.get('/garantias', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerGarantiasBicicletas);
router.get('/:id', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerVentaPorId);
router.put('/:id/anular', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), anularVenta);
router.patch('/:id/anular', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), anularVenta);

// Operaciones de modificación estructural posterior (Exclusivas de administradores)
router.post('/detalle', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), agregarDetalleVenta);

export default router;