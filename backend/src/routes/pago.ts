import { Router } from 'express';
import { pool } from '../db';

const router: Router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pp.id_pago, pp.fecha, pp.monto_total, pp.observaciones, pp.id_proveedor, pp.id_usuario, pp.id_metodo_pago,
             p.nombre_empresa, mp.nombre as metodo_pago
      FROM pago_proveedor pp
      JOIN proveedor p ON pp.id_proveedor = p.id_proveedor
      JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
      ORDER BY pp.id_pago DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM pago_proveedor WHERE id_pago = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pago' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id_proveedor, id_usuario, id_metodo_pago, fecha, monto_total, observaciones } = req.body;
    const result = await pool.query(
      'INSERT INTO pago_proveedor (id_proveedor, id_usuario, id_metodo_pago, fecha, monto_total, observaciones) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id_proveedor, id_usuario, id_metodo_pago, fecha || new Date(), monto_total, observaciones]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear pago' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_proveedor, id_usuario, id_metodo_pago, fecha, monto_total, observaciones } = req.body;
    const result = await pool.query(
      'UPDATE pago_proveedor SET id_proveedor = $1, id_usuario = $2, id_metodo_pago = $3, fecha = $4, monto_total = $5, observaciones = $6 WHERE id_pago = $7 RETURNING *',
      [id_proveedor, id_usuario, id_metodo_pago, fecha, monto_total, observaciones, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar pago' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM pago_proveedor WHERE id_pago = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json({ message: 'Pago eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar pago' });
  }
});

export default router;