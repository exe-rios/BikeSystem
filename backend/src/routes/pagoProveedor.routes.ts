import { Router } from 'express';
import { 
    crearPago, 
    obtenerPagos, 
    obtenerMetodosPago 
} from '../controllers/pagoProveedor.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para registro contable y consulta de pagos a proveedores. */
const router: ReturnType<typeof Router> = Router();

// Gestión de pagos y egresos financieros (Exclusivo Administradores)
router.use(verificarToken);
router.use(autorizarRoles('ADMIN', 'SUPERADMIN'));

router.get('/metodos-pago', obtenerMetodosPago);
router.post('/', crearPago);
router.get('/', obtenerPagos);

export default router;