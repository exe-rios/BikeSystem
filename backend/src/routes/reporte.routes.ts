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

/** Rutas de analítica financiera, estadísticas operativas y dashboard. */
const router: ReturnType<typeof Router> = Router();

// Todas las rutas de reportes requieren autenticación
router.use(verificarToken);

// GET /api/reportes/dashboard - Resumen del mes actual, alertas de stock y taller (Visible para empleados en InicioView)
router.get('/dashboard', autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerDashboard);

// Rutas de métricas y análisis financiero (Exclusivo Administradores)
router.get('/estadisticas', autorizarRoles('ADMIN', 'SUPERADMIN'), obtenerEstadisticas);
router.get('/ventas', autorizarRoles('ADMIN', 'SUPERADMIN'), obtenerVentasReporte);
router.get('/reparaciones', autorizarRoles('ADMIN', 'SUPERADMIN'), obtenerReparacionesReporte);
router.get('/egresos', autorizarRoles('ADMIN', 'SUPERADMIN'), obtenerEgresosReporte);

export default router;