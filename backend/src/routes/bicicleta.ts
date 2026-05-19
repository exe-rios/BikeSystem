import { Router } from 'express';
import { pool } from '../db';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id_bicicleta, b.marca, b.modelo, b.id_cliente, c.nombre, c.apellido
      FROM bicicleta b
      JOIN cliente c ON b.id_cliente = c.id_cliente
      ORDER BY b.id_bicicleta
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener bicicletas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM bicicleta WHERE id_bicicleta = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener bicicleta' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id_cliente, marca, modelo } = req.body;
    const result = await pool.query(
      'INSERT INTO bicicleta (id_cliente, marca, modelo) VALUES ($1, $2, $3) RETURNING *',
      [id_cliente, marca, modelo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear bicicleta' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cliente, marca, modelo } = req.body;
    const result = await pool.query(
      'UPDATE bicicleta SET id_cliente = $1, marca = $2, modelo = $3 WHERE id_bicicleta = $4 RETURNING *',
      [id_cliente, marca, modelo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar bicicleta' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM bicicleta WHERE id_bicicleta = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }
    res.json({ message: 'Bicicleta eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar bicicleta' });
  }
});

export default router;