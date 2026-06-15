import { Router } from 'express';
import { 
    crearVenta, 
    agregarDetalleVenta, 
    obtenerVentas, 
    obtenerVentaPorId 
} from '../controllers/venta.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, crearVenta);
router.get('/', verificarToken, obtenerVentas);
router.post('/detalle', verificarToken, agregarDetalleVenta);
router.get('/:id', verificarToken, obtenerVentaPorId);

export default router;