import { Router, type Router as ExpressRouter } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';


const router: ExpressRouter = Router();

// Test de salud
router.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'BikeSystem API esta corriendo' });
});

// Test de base de datos
router.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as hora, version() as version');
        res.json({ status: 'ok', connected: true, time: result.rows[0].hora, version: result.rows[0].version });
    } catch (err) {
        res.status(500).json({ status: 'error', connected: false, error: err instanceof Error ? err.message : 'Error desconocido' });
    }
});

// Login Real
router.post('/login', async (req, res) => {
    try {
        const { nombre_usuario, contrasena } = req.body;

        if (!nombre_usuario || !contrasena) {
            res.status(400).json({ error: 'Faltan credenciales' });
            return;
        }

        const query = `SELECT id_usuario, nombre_usuario, contrasena, rol FROM Usuario WHERE nombre_usuario = $1`;
        const result = await pool.query(query, [nombre_usuario]);
        const usuario = result.rows[0];

        // LOG DE CONTROL
        if (!usuario) {
            console.log(`❌ Usuario no encontrado en BD: "${nombre_usuario}"`);
            res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
            return;
        }

        const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
        
        // LOG DE CONTROL
        if (!contrasenaValida) {
            console.log(`❌ Contraseña incorrecta para el usuario: "${nombre_usuario}"`);
            res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
            return;
        }

        // Respaldo de clave secreta por si falta en el .env
        const secreto = process.env.JWT_SECRET || 'clave_secreta_bikesystem_desarrollo_2026';

        const token = jwt.sign(
            { id: usuario.id_usuario, rol: usuario.rol },
            secreto,
            { expiresIn: '8h' }
        );

        console.log(`✅ Login exitoso para: "${nombre_usuario}" (${usuario.rol})`);

        res.status(200).json({
            message: 'Login exitoso',
            token,
            usuario: { id: usuario.id_usuario, nombre: usuario.nombre_usuario, rol: usuario.rol }
        });
    } catch (err) {
        console.error('[AUTH LOGIN ERROR]:', err);
        res.status(500).json({ error: 'Error en el servidor al intentar iniciar sesión' });
    }
});

export default router;