import { Router } from 'express';
import { crearCliente, obtenerClientes, obtenerClientePorId, actualizarCliente, eliminarCliente } from '../controllers/cliente.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { autorizarRoles } from '../middlewares/roles.middleware.js';

/** Rutas para la administración de clientes y contactos. */
const router: ReturnType<typeof Router> = Router();

// Gestión diaria de clientes (Empleados y Administradores)
router.post('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), crearCliente);
router.get('/', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerClientes);
router.get('/:id', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), obtenerClientePorId);
router.put('/:id', verificarToken, autorizarRoles('EMPLEADO', 'ADMIN', 'SUPERADMIN'), actualizarCliente);

// Baja de cliente (Exclusivo Administradores)
router.delete('/:id', verificarToken, autorizarRoles('ADMIN', 'SUPERADMIN'), eliminarCliente);

export default router;