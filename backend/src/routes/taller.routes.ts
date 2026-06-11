import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// TODO: Implementar endpoints de taller
// GET /api/talleres - Obtener todas las reparaciones/talleres
// POST /api/talleres - Crear nueva reparación
// GET /api/talleres/:id - Obtener reparación por ID
// PUT /api/talleres/:id - Actualizar reparación
// DELETE /api/talleres/:id - Eliminar reparación

export default router;
