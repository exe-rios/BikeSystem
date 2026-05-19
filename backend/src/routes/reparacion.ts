import { Router } from 'express';
import { pool } from '../db';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id_reparacion, r.fecha_ingreso, r.fecha_egreso, r.estado, r.descripcion,
             r.costo_mano_obra, r.costo_total, r.id_bicicleta, b.marca, b.modelo, r.id_usuario
      FROM reparacion r
      JOIN bicicleta b ON r.id_bicicleta = b.id_bicicleta
      ORDER BY r.id_reparacion DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reparaciones' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM reparacion WHERE id_reparacion = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reparación' });
  }
});

router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id_bicicleta, id_usuario, fecha_ingreso, fecha_egreso, estado, descripcion, costo_mano_obra, costo_total, detalles } = req.body;

    const reparacionResult = await client.query(
      `INSERT INTO reparacion (id_bicicleta, id_usuario, fecha_ingreso, fecha_egreso, estado, descripcion, costo_mano_obra, costo_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id_bicicleta, id_usuario, fecha_ingreso || new Date(), fecha_egreso, estado, descripcion, costo_mano_obra || 0, costo_total || 0]
    );
    const id_reparacion = reparacionResult.rows[0].id_reparacion;

    if (detalles && detalles.length > 0) {
      for (const det of detalles) {
        await client.query(
          'INSERT INTO detalle_reparacion (id_reparacion, id_producto, cantidad, precio_unitario, costo_total) VALUES ($1, $2, $3, $4, $5)',
          [id_reparacion, det.id_producto, det.cantidad, det.precio_unitario, det.costo_total]
        );
        await client.query(
          'UPDATE productos SET cantidad = cantidad - $1 WHERE id_producto = $2',
          [det.cantidad, det.id_producto]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(reparacionResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear reparación' });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_bicicleta, id_usuario, fecha_ingreso, fecha_egreso, estado, descripcion, costo_mano_obra, costo_total } = req.body;
    const result = await pool.query(
      `UPDATE reparacion SET id_bicicleta = $1, id_usuario = $2, fecha_ingreso = $3, fecha_egreso = $4,
       estado = $5, descripcion = $6, costo_mano_obra = $7, costo_total = $8 WHERE id_reparacion = $9 RETURNING *`,
      [id_bicicleta, id_usuario, fecha_ingreso, fecha_egreso, estado, descripcion, costo_mano_obra, costo_total, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar reparación' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM reparacion WHERE id_reparacion = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }
    res.json({ message: 'Reparación eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar reparación' });
  }
});

router.get('/:id/detalles', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT dr.*, p.nombre as nombre_producto
      FROM detalle_reparacion dr
      JOIN productos p ON dr.id_producto = p.id_producto
      WHERE dr.id_reparacion = $1
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener detalles de reparación' });
  }
});

export default router;