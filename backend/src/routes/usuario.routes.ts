import { Router } from 'express';
import { 
    obtenerUsuarios, 
    crearUsuario, 
    actualizarUsuario, 
    eliminarUsuario 
} from '../controllers/usuario.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para la administración de usuarios y roles del personal. */
const router: ReturnType<typeof Router> = Router();

// Gestión de usuarios y empleados (Exclusivo Administradores)
router.use(verificarToken);
router.use(autorizarRoles('ADMIN', 'SUPERADMIN'));

router.get('/', obtenerUsuarios);
router.get('/registrados', obtenerUsuarios); // compatibilidad
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

export default router;