import { Router } from 'express';
import { crearCliente, obtenerClientes } from '../controllers/cliente.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// Rutas protegidas por el Patovica:
// Solo alguien que haya iniciado sesión (Diego o un empleado) puede gestionar clientes.
router.post('/', verificarToken, crearCliente);
router.get('/', verificarToken, obtenerClientes);

export default router;