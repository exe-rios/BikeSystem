import { Router } from 'express';
import { pool } from '../db';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id_usuario, nom_usuario, rol FROM usuario');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id_usuario, nom_usuario, rol FROM usuario WHERE id_usuario = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nom_usuario, contrasena, rol } = req.body;
    const result = await pool.query(
      'INSERT INTO usuario (nom_usuario, contrasena, rol) VALUES ($1, $2, $3) RETURNING id_usuario, nom_usuario, rol',
      [nom_usuario, contrasena, rol]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom_usuario, contrasena, rol } = req.body;
    const result = await pool.query(
      'UPDATE usuario SET nom_usuario = $1, contrasena = $2, rol = $3 WHERE id_usuario = $4 RETURNING id_usuario, nom_usuario, rol',
      [nom_usuario, contrasena, rol, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM usuario WHERE id_usuario = $1 RETURNING id_usuario', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { nom_usuario, contrasena } = req.body;
    const result = await pool.query(
      'SELECT id_usuario, nom_usuario, rol FROM usuario WHERE nom_usuario = $1 AND contrasena = $2',
      [nom_usuario, contrasena]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en el login' });
  }
});

export default router;