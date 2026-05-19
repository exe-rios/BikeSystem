import { Router } from 'express';
import { pool } from '../db.js';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM metodo_pago ORDER BY id_metodo_pago');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener métodos de pago' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM metodo_pago WHERE id_metodo_pago = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Método de pago no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener método de pago' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;
    const result = await pool.query(
      'INSERT INTO metodo_pago (nombre) VALUES ($1) RETURNING *',
      [nombre]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear método de pago' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM metodo_pago WHERE id_metodo_pago = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Método de pago no encontrado' });
    }
    res.json({ message: 'Método de pago eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar método de pago' });
  }
});

export default router;