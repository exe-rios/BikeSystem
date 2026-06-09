import { Router } from 'express';
import { crearCliente, obtenerClientes, obtenerClientePorId, actualizarCliente, eliminarCliente } from '../controllers/cliente.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// Rutas protegidas por el Patovica:
// Solo alguien que haya iniciado sesión (Diego o un empleado) puede gestionar clientes.
router.post('/', verificarToken, crearCliente);
router.get('/', verificarToken, obtenerClientes);
router.get('/:id', verificarToken, obtenerClientePorId);
router.put('/:id', verificarToken, actualizarCliente);
router.delete('/:id', verificarToken, eliminarCliente);

export default router;