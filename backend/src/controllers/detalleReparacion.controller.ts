import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

export const agregarRepuesto = async (req: Request, res: Response): Promise<void> => {
    // Pedimos un cliente exclusivo a la base de datos para la transacción
    const client = await pool.connect();

    try {
        const { id_reparacion, id_producto, cantidad, precio_unitario } = req.body;

        if (!id_reparacion || !id_producto || !cantidad || !precio_unitario) {
            res.status(400).json({ error: 'Faltan datos obligatorios para el detalle' });
            return;
        }

        const costo_total_detalle = cantidad * precio_unitario;

        // 1. INICIAMOS LA TRANSACCIÓN
        await client.query('BEGIN');

        // Paso A: Insertar en Detalle_Reparacion
        const queryInsert = `
            INSERT INTO Detalle_Reparacion (id_reparacion, id_producto, cantidad, precio_unitario, costo_total)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const resultDetalle = await client.query(queryInsert, [id_reparacion, id_producto, cantidad, precio_unitario, costo_total_detalle]);

        // Paso B: Descontar el stock del Producto
        const queryStock = `
            UPDATE Productos 
            SET cantidad = cantidad - $1 
            WHERE id_producto = $2;
        `;
        await client.query(queryStock, [cantidad, id_producto]);

        // Paso C: Actualizar el costo total de la Reparacion (sumándole este nuevo repuesto)
        const queryCosto = `
            UPDATE Reparacion 
            SET costo_total = costo_total + $1 
            WHERE id_reparacion = $2;
        `;
        await client.query(queryCosto, [costo_total_detalle, id_reparacion]);

        // 2. CONFIRMAMOS LA TRANSACCIÓN (Se guardan los 3 cambios juntos)
        await client.query('COMMIT');

        res.status(201).json({
            message: 'Repuesto agregado, stock descontado y costo actualizado con éxito',
            detalle: resultDetalle.rows[0]
        });
    } catch (error) {
        // Si CUALQUIER cosa falla, hacemos ROLLBACK y la base de datos vuelve a como estaba antes del BEGIN
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error crítico al procesar el repuesto. Operación cancelada por seguridad.' });
    } finally {
        // Soltamos la conexión para que otros la puedan usar
        client.release();
    }
};