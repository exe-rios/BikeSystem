import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js'

dotenv.config();
// 1. Creamos la aplicación (nuestro "empleado")
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Le enseñamos a leer formato JSON (el idioma en el que le va a hablar React)
app.use(cors());
app.use(express.json());

// 3. Creamos una ruta de prueba para verificar que el servidor funciona
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BikeSystem API esta corriendo' });
});

// 4. Test de conexión a la base de datos
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as hora, version() as version');
    res.json({
      status: 'ok',
      connected: true,
      time: result.rows[0].hora,
      version: result.rows[0].version
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      connected: false,
      error: err instanceof Error ? err.message : 'Error desconocido'
    });
  }
});

// 5. NUEVA RUTA: Crear el primer administrador (Temporal)
app.post('/api/setup-admin', async (req, res) => {
  try {
    const { Nom_usuario, contrasena, rol } = req.body;

    // 1. Validamos que nos envíen los datos
    if (!Nom_usuario || !contrasena || !rol) {
      res.status(400).json({ error: 'Faltan datos' });
      return;
    }

    // 2. Encriptamos la contraseña con bcrypt (10 es el nivel de seguridad)
    const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

    // 3. Guardamos el usuario en la base de datos
    const query = `
      INSERT INTO Usuario (Nom_usuario, contrasena, rol) 
      VALUES ($1, $2, $3) 
      RETURNING id_usuario, Nom_usuario, rol
    `;
    const result = await pool.query(query, [Nom_usuario, contrasenaEncriptada, rol]);

    // 4. Respondemos con éxito
    res.status(201).json({
      message: 'Usuario administrador creado con éxito',
      usuario: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      error: 'Error al crear usuario',
      detalle: err instanceof Error ? err.message : 'Error desconocido'
    });
  }
});
// 6. RUTA DE LOGIN REAL
app.post('/api/login', async (req, res) => {
  try {
    const { Nom_usuario, contrasena } = req.body;

    if (!Nom_usuario || !contrasena) {
      res.status(400).json({ error: 'Faltan credenciales' });
      return;
    }

    // 1. Buscamos al usuario en la base de datos
    const query = `SELECT id_usuario, nom_usuario, contrasena, rol FROM Usuario WHERE nom_usuario = $1`;
    const result = await pool.query(query, [Nom_usuario]);
    const usuario = result.rows[0];

    if (!usuario) {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      return;
    }

    // 2. Comparamos la contraseña enviada con la encriptada en la base de datos
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!contrasenaValida) {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      return;
    }

    // 3. Generamos el Token JWT (la credencial temporal)
    // Nota: El 'secreto_super_seguro' debería ir en tu archivo .env en producción
    const token = jwt.sign(
      { id: usuario.id_usuario, rol: usuario.rol },
      process.env.JWT_SECRET || 'secreto_super_seguro',
      { expiresIn: '8h' } // El token caduca en 8 horas
    );

    // 4. Devolvemos el éxito y el token
    res.status(200).json({
      message: 'Login exitoso',
      token: token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nom_usuario,
        rol: usuario.rol
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor al intentar iniciar sesión' });
  }
});

// 7. ARRANCAR EL SERVIDOR (Siempre tiene que ser lo último)
app.listen(PORT, () => {
  console.log(`[Server]: 🚴 Backend corriendo en http://localhost:${PORT}`);
});