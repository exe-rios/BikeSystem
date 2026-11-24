import { Router } from 'express';
import { obtenerCotizacionDolar, actualizarCotizacionDolar } from '../controllers/configuracion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas de configuración del sistema (cotización manual del dólar). */
const router: ReturnType<typeof Router> = Router();

router.get('/dolar', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerCotizacionDolar);
router.put('/dolar', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), actualizarCotizacionDolar);

export default router;
