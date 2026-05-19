import { Router } from 'express';
import { pool } from '../db';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id_venta, v.fecha, v.costototal, v.id_cliente, v.id_usuario, c.nombre, c.apellido
      FROM venta v
      JOIN cliente c ON v.id_cliente = c.id_cliente
      ORDER BY v.id_venta DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM venta WHERE id_venta = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener venta' });
  }
});

router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id_cliente, id_usuario, fecha, costototal, detalles } = req.body;

    const ventaResult = await client.query(
      'INSERT INTO venta (id_cliente, id_usuario, fecha, costototal) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_cliente, id_usuario, fecha || new Date(), costototal || 0]
    );
    const id_venta = ventaResult.rows[0].id_venta;

    if (detalles && detalles.length > 0) {
      for (const det of detalles) {
        await client.query(
          'INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, costo_total) VALUES ($1, $2, $3, $4, $5)',
          [id_venta, det.id_producto, det.cantidad, det.precio_unitario, det.costo_total]
        );
        await client.query(
          'UPDATE productos SET cantidad = cantidad - $1 WHERE id_producto = $2',
          [det.cantidad, det.id_producto]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(ventaResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear venta' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM venta WHERE id_venta = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json({ message: 'Venta eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar venta' });
  }
});

router.get('/:id/detalles', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT dv.*, p.nombre as nombre_producto
      FROM detalle_venta dv
      JOIN productos p ON dv.id_producto = p.id_producto
      WHERE dv.id_venta = $1
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener detalles de venta' });
  }
});

export default router;