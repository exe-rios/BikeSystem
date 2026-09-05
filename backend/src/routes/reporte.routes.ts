import { Router } from 'express';
import { 
    obtenerDashboard, 
    obtenerEstadisticas, 
    obtenerVentasReporte, 
    obtenerReparacionesReporte, 
    obtenerEgresosReporte 
} from '../controllers/reporte.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

const router: ReturnType<typeof Router> = Router();

// Todas las rutas de reportes requieren autenticación y rol de administrador
router.use(verificarToken);
router.use(autorizarRoles('ADMIN', 'SUPERADMIN'));

// GET /api/reportes/dashboard - Resumen del mes actual
router.get('/dashboard', obtenerDashboard);

// GET /api/reportes/estadisticas - Agregaciones y KPIs por rango de fechas
router.get('/estadisticas', obtenerEstadisticas);

// GET /api/reportes/ventas - Detalle de ventas filtrado
router.get('/ventas', obtenerVentasReporte);

// GET /api/reportes/reparaciones - Detalle de reparaciones filtrado
router.get('/reparaciones', obtenerReparacionesReporte);

// GET /api/reportes/egresos - Detalle de pagos a proveedores filtrado
router.get('/egresos', obtenerEgresosReporte);

export default router;