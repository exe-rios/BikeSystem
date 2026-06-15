import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

// 1. Crear la cabecera de la Venta (POST)
export const crearVenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_cliente, id_usuario } = req.body;

        if (!id_cliente || !id_usuario) {
            res.status(400).json({ error: 'Faltan datos obligatorios (id_cliente, id_usuario)' });
            return;
        }

        // costo_total arranca en 0. Se va a ir sumando cuando agreguemos el detalle.
        const query = `
            INSERT INTO Venta (id_cliente, id_usuario, costo_total)
            VALUES ($1, $2, 0)
            RETURNING *;
        `;
        const result = await pool.query(query, [id_cliente, id_usuario]);

        res.status(201).json({
            message: 'Ticket de venta iniciado correctamente',
            venta: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al iniciar la venta' });
    }
};

// 2. Agregar un producto a la venta (POST) - TRANSACCIÓN SEGURA
export const agregarDetalleVenta = async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
        const { id_venta, id_producto, cantidad, precio_unitario } = req.body;

        if (!id_venta || !id_producto || !cantidad || !precio_unitario) {
            res.status(400).json({ error: 'Faltan datos para procesar el producto' });
            return;
        }

        const costo_total_detalle = cantidad * precio_unitario;

        await client.query('BEGIN');

        // A. Registrar el detalle
        const queryInsert = `
            INSERT INTO Detalle_Venta (id_venta, id_producto, cantidad, precio_unitario, costo_total)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const resultDetalle = await client.query(queryInsert, [id_venta, id_producto, cantidad, precio_unitario, costo_total_detalle]);

        // B. Descontar el stock (Garantiza que lo que se vende, sale del inventario real)
        const queryStock = `
            UPDATE Productos 
            SET cantidad = cantidad - $1 
            WHERE id_producto = $2;
        `;
        await client.query(queryStock, [cantidad, id_producto]);

        // C. Sumar al ticket final
        const queryCosto = `
            UPDATE Venta 
            SET costo_total = costo_total + $1 
            WHERE id_venta = $2;
        `;
        await client.query(queryCosto, [costo_total_detalle, id_venta]);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Producto facturado y stock actualizado',
            detalle: resultDetalle.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al procesar el producto. Venta cancelada por seguridad.' });
    } finally {
        client.release();
    }
};

// 3. Ver todas las ventas para el reporte de caja (GET)
export const obtenerVentas = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT v.id_venta, v.fecha, v.costo_total,
                   c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
                   u.nombre_usuario AS vendedor
            FROM Venta v
            INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
            INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
            ORDER BY v.id_venta DESC;
        `;
        const result = await pool.query(query);

        res.status(200).json({ total: result.rowCount, ventas: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de ventas' });
    }
};

// 4. Obtener una venta específica con todos sus productos facturados (GET)
export const obtenerVentaPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const queryCabecera = `
            SELECT v.*, c.nombre, c.apellido, u.nombre_usuario AS vendedor
            FROM Venta v
            INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
            INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
            WHERE v.id_venta = $1;
        `;
        const resultCabecera = await pool.query(queryCabecera, [id]);

        if (resultCabecera.rowCount === 0) {
            res.status(404).json({ error: 'Venta no encontrada' });
            return;
        }

        const queryDetalle = `
            SELECT dv.*, p.nombre, p.marca
            FROM Detalle_Venta dv
            INNER JOIN Productos p ON dv.id_producto = p.id_producto
            WHERE dv.id_venta = $1;
        `;
        const resultDetalle = await pool.query(queryDetalle, [id]);

        res.status(200).json({
            venta: resultCabecera.rows[0],
            productos_vendidos: resultDetalle.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al recuperar el ticket de venta' });
    }
};