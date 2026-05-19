import { Router } from 'express';
import { pool } from '../db';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cliente ORDER BY id_cliente');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM cliente WHERE id_cliente = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;
    const result = await pool.query(
      'INSERT INTO cliente (nombre, apellido, dni, telefono, email, direccion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, apellido, dni, telefono, email, direccion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;
    const result = await pool.query(
      'UPDATE cliente SET nombre = $1, apellido = $2, dni = $3, telefono = $4, email = $5, direccion = $6 WHERE id_cliente = $7 RETURNING *',
      [nombre, apellido, dni, telefono, email, direccion, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM cliente WHERE id_cliente = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;