import { Router } from 'express';
import { pool } from '../db';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.id_ingreso, i.fecha_ingreso, i.num_comprobante, i.id_proveedor, i.id_usuario,
             p.nombre_empresa
      FROM ingreso_stock i
      JOIN proveedor p ON i.id_proveedor = p.id_proveedor
      ORDER BY i.id_ingreso DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ingresos de stock' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM ingreso_stock WHERE id_ingreso = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingreso no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ingreso' });
  }
});

router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id_proveedor, id_usuario, fecha_ingreso, num_comprobante, detalles } = req.body;

    const ingresoResult = await client.query(
      'INSERT INTO ingreso_stock (id_proveedor, id_usuario, fecha_ingreso, num_comprobante) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_proveedor, id_usuario, fecha_ingreso || new Date(), num_comprobante]
    );
    const id_ingreso = ingresoResult.rows[0].id_ingreso;

    if (detalles && detalles.length > 0) {
      for (const det of detalles) {
        await client.query(
          'INSERT INTO detalle_ingreso (id_ingreso, id_producto, cantidad, precio_costo) VALUES ($1, $2, $3, $4)',
          [id_ingreso, det.id_producto, det.cantidad, det.precio_costo]
        );
        await client.query(
          'UPDATE productos SET cantidad = cantidad + $1 WHERE id_producto = $2',
          [det.cantidad, det.id_producto]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(ingresoResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear ingreso de stock' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM ingreso_stock WHERE id_ingreso = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingreso no encontrado' });
    }
    res.json({ message: 'Ingreso de stock eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar ingreso' });
  }
});

router.get('/:id/detalles', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT di.*, p.nombre as nombre_producto
      FROM detalle_ingreso di
      JOIN productos p ON di.id_producto = p.id_producto
      WHERE di.id_ingreso = $1
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener detalles de ingreso' });
  }
});

export default router;