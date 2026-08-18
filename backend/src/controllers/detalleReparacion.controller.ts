import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

export const agregarRepuesto = async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
        const { id_reparacion, id_producto, cantidad, precio_unitario } = req.body;

        if (!id_reparacion || !id_producto || !cantidad || !precio_unitario) {
            res.status(400).json({ error: 'Faltan datos obligatorios (id_reparacion, id_producto, cantidad, precio_unitario)' });
            return;
        }

        const cantNum = Number(cantidad);
        const precioNum = Number(precio_unitario);
        if (cantNum <= 0 || precioNum < 0) {
            res.status(400).json({ error: 'Cantidad y precio deben ser valores positivos' });
            return;
        }

        // 1. INICIAMOS LA TRANSACCIÓN
        await client.query('BEGIN');

        // Paso A: Validar stock disponible
        const queryCheck = 'SELECT id_producto, nombre, cantidad FROM Productos WHERE id_producto = $1 FOR UPDATE;';
        const resCheck = await client.query(queryCheck, [id_producto]);

        if (resCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'El repuesto o producto no existe en el catálogo' });
            return;
        }

        const producto = resCheck.rows[0];
        if (producto.cantidad < cantNum) {
            await client.query('ROLLBACK');
            res.status(400).json({ 
                error: `Stock insuficiente para "${producto.nombre}". Stock disponible: ${producto.cantidad}` 
            });
            return;
        }

        const costo_total_detalle = cantNum * precioNum;

        // Paso B: Insertar en Detalle_Reparacion
        const queryInsert = `
            INSERT INTO Detalle_Reparacion (id_reparacion, id_producto, cantidad, precio_unitario, costo_total)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const resultDetalle = await client.query(queryInsert, [id_reparacion, id_producto, cantNum, precioNum, costo_total_detalle]);

        // Paso C: Descontar el stock del Producto
        const queryStock = `
            UPDATE Productos 
            SET cantidad = cantidad - $1 
            WHERE id_producto = $2;
        `;
        await client.query(queryStock, [cantNum, id_producto]);

        // Paso D: Actualizar el costo total de la Reparacion (sumándole este nuevo repuesto)
        const queryCosto = `
            UPDATE Reparacion 
            SET costo_total = costo_total + $1 
            WHERE id_reparacion = $2;
        `;
        await client.query(queryCosto, [costo_total_detalle, id_reparacion]);

        // 2. CONFIRMAMOS LA TRANSACCIÓN
        await client.query('COMMIT');

        res.status(201).json({
            message: 'Repuesto agregado al taller, stock descontado y total actualizado',
            detalle: resultDetalle.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Detalle Reparacion Error]:', error);
        res.status(500).json({ error: 'Error crítico al procesar el repuesto en el taller.' });
    } finally {
        client.release();
    }
};

// Obtener repuestos de una orden (GET)
export const obtenerRepuestosDeReparacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_reparacion } = req.params;
        const query = `
            SELECT dr.*, p.nombre, p.marca, p.modelo, p.tipo_prod
            FROM Detalle_Reparacion dr
            INNER JOIN Productos p ON dr.id_producto = p.id_producto
            WHERE dr.id_reparacion = $1
            ORDER BY dr.id_detalle_rep ASC;
        `;
        const result = await pool.query(query, [id_reparacion]);
        res.status(200).json({ repuestos: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar repuestos de la orden' });
    }
};