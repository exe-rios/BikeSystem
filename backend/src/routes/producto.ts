import { Router } from 'express';
import { pool } from '../db';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id_producto');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM productos WHERE id_producto = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, marca, modelo, tipo_prod, cantidad, num_serie, color, rodado, talle, precio, stock_minimo } = req.body;
    const result = await pool.query(
      `INSERT INTO productos (nombre, marca, modelo, tipo_prod, cantidad, num_serie, color, rodado, talle, precio, stock_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [nombre, marca, modelo, tipo_prod, cantidad || 0, num_serie, color, rodado, talle, precio, stock_minimo || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, marca, modelo, tipo_prod, cantidad, num_serie, color, rodado, talle, precio, stock_minimo } = req.body;
    const result = await pool.query(
      `UPDATE productos SET nombre = $1, marca = $2, modelo = $3, tipo_prod = $4, cantidad = $5, num_serie = $6,
       color = $7, rodado = $8, talle = $9, precio = $10, stock_minimo = $11 WHERE id_producto = $12 RETURNING *`,
      [nombre, marca, modelo, tipo_prod, cantidad, num_serie, color, rodado, talle, precio, stock_minimo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM productos WHERE id_producto = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

export default router;