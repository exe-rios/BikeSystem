import { Router } from 'express';
import { pool } from '../db';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM proveedor ORDER BY id_proveedor');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM proveedor WHERE id_proveedor = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre_empresa, cuit, telefono, email, direccion } = req.body;
    const result = await pool.query(
      'INSERT INTO proveedor (nombre_empresa, cuit, telefono, email, direccion) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre_empresa, cuit, telefono, email, direccion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_empresa, cuit, telefono, email, direccion } = req.body;
    const result = await pool.query(
      'UPDATE proveedor SET nombre_empresa = $1, cuit = $2, telefono = $3, email = $4, direccion = $5 WHERE id_proveedor = $6 RETURNING *',
      [nombre_empresa, cuit, telefono, email, direccion, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM proveedor WHERE id_proveedor = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

export default router;