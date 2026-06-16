import { Router } from 'express';
import { 
    crearPago, 
    obtenerPagos, 
    obtenerMetodosPago 
} from '../controllers/pagoProveedor.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.get('/metodos-pago', verificarToken, obtenerMetodosPago);
router.post('/', verificarToken, crearPago);
router.get('/', verificarToken, obtenerPagos);

export default router;