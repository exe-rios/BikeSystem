import { Router } from 'express';
import {
  reportarErrorCliente,
  obtenerLogsSistema,
  descargarLogsSistema,
  obtenerLogsRemotos,
  descargarLogsRemotos
} from '../controllers/logs.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas de diagnóstico técnico y logs del sistema. */
const router: ReturnType<typeof Router> = Router();

router.use(verificarToken);

// Cualquier usuario autenticado puede reportar un error no controlado de su interfaz
router.post('/cliente', reportarErrorCliente);

// Consulta y descarga de logs (locales y remotos) restringidas exclusivamente a SUPERADMIN
router.use(autorizarRoles('SUPERADMIN'));
router.get('/', obtenerLogsSistema);
router.get('/descargar', descargarLogsSistema);
router.get('/remotos', obtenerLogsRemotos);
router.get('/remotos/descargar', descargarLogsRemotos);

export default router;
