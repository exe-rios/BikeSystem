import { Router, type Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// 1. Consultar Usuarios Registrados (GET)
router.get('/', verificarToken, async (req: PeticionConUsuario, res: Response): Promise<void> => {
    try {
        const query = 'SELECT id_usuario, nombre_usuario, rol FROM Usuario ORDER BY id_usuario ASC';
        const result = await pool.query(query);
        res.json({ total: result.rowCount, usuarios: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Error al consultar la lista de usuarios' });
    }
});

// Ruta de compatibilidad
router.get('/registrados', async (req, res) => {
    try {
        const query = 'SELECT id_usuario, nombre_usuario, rol FROM Usuario ORDER BY id_usuario ASC';
        const result = await pool.query(query);
        res.json({ status: 'ok', total: result.rowCount, usuarios: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
});

// 2. Crear Empleado / Usuario (POST) - Solo ADMIN o SUPERADMIN
router.post('/', verificarToken, async (req: PeticionConUsuario, res: Response): Promise<void> => {
    try {
        const rolLogueado = req.usuarioToken?.rol;

        if (rolLogueado !== 'ADMIN' && rolLogueado !== 'SUPERADMIN') {
            res.status(403).json({ error: 'No tienes permiso para crear usuarios en el sistema.' });
            return;
        }

        const { nombre_usuario, contrasena, rol } = req.body;
        if (!nombre_usuario || !contrasena || !rol) {
            res.status(400).json({ error: 'Faltan datos obligatorios (nombre_usuario, contrasena, rol)' });
            return;
        }

        const nombreLimpio = nombre_usuario.trim().toLowerCase();

        // Verificar si ya existe
        const queryExiste = 'SELECT id_usuario FROM Usuario WHERE LOWER(nombre_usuario) = $1';
        const resExiste = await pool.query(queryExiste, [nombreLimpio]);
        if (resExiste.rowCount && resExiste.rowCount > 0) {
            res.status(400).json({ error: `El nombre de usuario "${nombre_usuario}" ya está en uso.` });
            return;
        }

        const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

        const query = `INSERT INTO Usuario (nombre_usuario, contrasena, rol) 
                        VALUES ($1, $2, $3) 
                        RETURNING id_usuario, nombre_usuario, rol`;
        const result = await pool.query(query, [nombreLimpio, contrasenaEncriptada, rol]);

        res.status(201).json({ message: 'Empleado creado con éxito', usuario: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Error al intentar crear el usuario' });
    }
});

// 3. Modificar Usuario (PUT) - Actualizar rol o contraseña
router.put('/:id', verificarToken, async (req: PeticionConUsuario, res: Response): Promise<void> => {
    try {
        const rolLogueado = req.usuarioToken?.rol;
        if (rolLogueado !== 'ADMIN' && rolLogueado !== 'SUPERADMIN') {
            res.status(403).json({ error: 'No tienes permisos para modificar usuarios.' });
            return;
        }

        const { id } = req.params;
        const { rol, contrasena } = req.body;

        if (contrasena && contrasena.trim()) {
            const contrasenaHash = await bcrypt.hash(contrasena, 10);
            const query = `
                UPDATE Usuario 
                SET rol = COALESCE($1, rol), contrasena = $2 
                WHERE id_usuario = $3 
                RETURNING id_usuario, nombre_usuario, rol;
            `;
            const result = await pool.query(query, [rol || null, contrasenaHash, id]);
            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Usuario no encontrado' });
                return;
            }
            res.status(200).json({ message: 'Usuario y contraseña actualizados con éxito', usuario: result.rows[0] });
            return;
        }

        const query = `
            UPDATE Usuario 
            SET rol = COALESCE($1, rol) 
            WHERE id_usuario = $2 
            RETURNING id_usuario, nombre_usuario, rol;
        `;
        const result = await pool.query(query, [rol || null, id]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        res.status(200).json({ message: 'Rol de usuario actualizado', usuario: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// 4. Eliminar Usuario (DELETE)
router.delete('/:id', verificarToken, async (req: PeticionConUsuario, res: Response): Promise<void> => {
    try {
        const rolLogueado = req.usuarioToken?.rol;
        if (rolLogueado !== 'SUPERADMIN') {
            res.status(403).json({ error: 'Solo el SUPERADMIN puede eliminar usuarios del sistema.' });
            return;
        }

        const { id } = req.params;

        // No permitir eliminarse a uno mismo
        if (Number(id) === req.usuarioToken?.id) {
            res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de usuario en uso.' });
            return;
        }

        const query = 'DELETE FROM Usuario WHERE id_usuario = $1 RETURNING id_usuario, nombre_usuario;';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        res.status(200).json({ message: `Usuario "${result.rows[0].nombre_usuario}" eliminado correctamente.` });
    } catch (err) {
        res.status(500).json({ 
            error: 'No se puede eliminar el usuario', 
            detalle: 'Tiene registros históricos asociados (ventas, reparaciones o pagos).' 
        });
    }
});

export default router;