import { Router } from 'express';
import { 
    obtenerUsuarios, 
    crearUsuario, 
    actualizarUsuario, 
    eliminarUsuario 
} from '../controllers/usuario.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// Rutas de administración de usuarios / empleados
router.get('/', verificarToken, obtenerUsuarios);
router.get('/registrados', verificarToken, obtenerUsuarios); // compatibilidad
router.post('/', verificarToken, crearUsuario);
router.put('/:id', verificarToken, actualizarUsuario);
router.delete('/:id', verificarToken, eliminarUsuario);

export default router;