import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

export const registrarIngresoStock = async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
        // Recibimos los datos del remito y los productos que ingresan
        const { id_proveedor, id_usuario, num_comprobante, detalles } = req.body;
        // "detalles" será un arreglo de objetos: [{ id_producto: 1, cantidad: 10, precio_costo: 5000 }, ...]

        if (!id_proveedor || !id_usuario || !detalles || detalles.length === 0) {
            res.status(400).json({ error: 'Faltan datos del comprobante o no hay productos detallados' });
            return;
        }

        await client.query('BEGIN');

        // A. Crear la cabecera del Ingreso
        const queryIngreso = `
            INSERT INTO Ingreso_Stock (id_proveedor, id_usuario, num_comprobante)
            VALUES ($1, $2, $3)
            RETURNING id_ingreso;
        `;
        const resultIngreso = await client.query(queryIngreso, [id_proveedor, id_usuario, num_comprobante]);
        const id_ingreso = resultIngreso.rows[0].id_ingreso;

        // B. Recorrer el arreglo de productos para registrarlos y sumar el stock
        for (const item of detalles) {
            // Insertar en Detalle_Ingreso
            const queryDetalle = `
                INSERT INTO Detalle_Ingreso (id_ingreso, id_producto, cantidad, precio_costo)
                VALUES ($1, $2, $3, $4);
            `;
            await client.query(queryDetalle, [id_ingreso, item.id_producto, item.cantidad, item.precio_costo]);

            // Sumar el stock en la tabla Productos
            const queryStock = `
                UPDATE Productos 
                SET cantidad = cantidad + $1 
                WHERE id_producto = $2;
            `;
            await client.query(queryStock, [item.cantidad, item.id_producto]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Mercadería ingresada y stock actualizado correctamente',
            id_ingreso: id_ingreso
        });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al procesar el remito. Ingreso cancelado.' });
    } finally {
        client.release();
    }
};

// 2. Obtener el historial de remitos ingresados (GET)
export const obtenerIngresosStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT i.id_ingreso, i.fecha_ingreso, i.num_comprobante,
                   p.nombre_empresa AS proveedor, u.nombre_usuario AS usuario_registro
            FROM NyA_Ingreso_Stock i
            INNER JOIN Proveedor p ON i.id_proveedor = p.id_proveedor
            INNER JOIN Usuario u ON i.id_usuario = u.id_usuario
            ORDER BY i.id_ingreso DESC;
        `;
        // Nota: Asegúrate de usar el nombre exacto de la tabla de tu base de datos (Ingreso_Stock)
        const queryCorregida = query.replace('NyA_Ingreso_Stock', 'Ingreso_Stock');
        const result = await pool.query(queryCorregida);
        
        res.status(200).json({ total: result.rowCount, ingresos: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de stock' });
    }
};