import { Router, type Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// Crear Usuarios (Protegido)
router.post('/', verificarToken, async (req: PeticionConUsuario, res: Response): Promise<void> => {
    try {
        const rolLogueado = req.usuarioToken?.rol;

        if (rolLogueado !== 'ADMIN' && rolLogueado !== 'SUPERADMIN') {
            res.status(403).json({ error: 'No tienes permiso para crear usuarios en el sistema.' });
            return;
        }

        const { Nom_usuario, contrasena, rol } = req.body;
        if (!Nom_usuario || !contrasena || !rol) {
            res.status(400).json({ error: 'Faltan datos para crear el empleado.' });
            return;
        }

        const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

        const query = `INSERT INTO Usuario (nom_usuario, contrasena, rol) 
                        VALUES ($1, $2, $3) 
                        RETURNING id_usuario, nom_usuario, rol`;
        const result = await pool.query(query, [Nom_usuario, contrasenaEncriptada, rol]);

        res.status(201).json({ message: 'Empleado creado con éxito', usuario: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Error al intentar crear el usuario' });
    }
});

// Consultar Usuarios Registrados
router.get('/registrados', async (req, res) => {
    try {
        const query = 'SELECT id_usuario, nom_usuario, rol FROM Usuario ORDER BY id_usuario ASC';
        const result = await pool.query(query);
        res.json({ status: 'ok', total: result.rowCount, usuarios: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
});

export default router;