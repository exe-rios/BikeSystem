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

const router: ReturnType<typeof Router> = Router();

router.post('/', verificarToken, crearVenta);
router.get('/', verificarToken, obtenerVentas);
router.get('/metodos-pago', verificarToken, obtenerMetodosPago);
router.get('/garantias', verificarToken, obtenerGarantiasBicicletas);
router.post('/detalle', verificarToken, agregarDetalleVenta);
router.get('/:id', verificarToken, obtenerVentaPorId);
router.put('/:id/anular', verificarToken, anularVenta);
router.patch('/:id/anular', verificarToken, anularVenta);

export default router;