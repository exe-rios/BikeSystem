import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';

// 1. Registrar Remito / Ingreso de Mercadería (POST)
export const registrarIngresoStock = async (req: PeticionConUsuario, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
        const id_usuario = req.usuarioToken?.id || req.body.id_usuario || 1;
        const { id_proveedor, num_comprobante, detalles } = req.body;

        if (!id_proveedor || !id_usuario || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
            res.status(400).json({ error: 'Faltan datos del comprobante o no hay productos detallados en el remito.' });
            return;
        }

        await client.query('BEGIN');

        // A. Crear la cabecera del Ingreso
        const queryIngreso = `
            INSERT INTO Ingreso_Stock (id_proveedor, id_usuario, num_comprobante)
            VALUES ($1, $2, $3)
            RETURNING id_ingreso, fecha_ingreso;
        `;
        const resultIngreso = await client.query(queryIngreso, [id_proveedor, id_usuario, num_comprobante || 'S/N']);
        const ingresoCreado = resultIngreso.rows[0];
        const id_ingreso = ingresoCreado.id_ingreso;

        const detallesGuardados = [];

        // B. Recorrer el arreglo de productos para registrarlos y sumar el stock
        for (const item of detalles) {
            const { id_producto, cantidad, precio_costo } = item;

            if (!id_producto || !cantidad || cantidad <= 0) {
                throw new Error('Datos de artículo inválidos en el remito');
            }

            // Insertar en Detalle_Ingreso
            const queryDetalle = `
                INSERT INTO Detalle_Ingreso (id_ingreso, id_producto, cantidad, precio_costo)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const resultDetalle = await client.query(queryDetalle, [id_ingreso, id_producto, cantidad, Number(precio_costo) || 0]);
            detallesGuardados.push(resultDetalle.rows[0]);

            // Sumar el stock en la tabla Productos
            const queryStock = `
                UPDATE Productos 
                SET cantidad = cantidad + $1 
                WHERE id_producto = $2;
            `;
            await client.query(queryStock, [cantidad, id_producto]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Mercadería recepcionada y stock actualizado correctamente',
            id_ingreso: id_ingreso,
            ingreso: ingresoCreado,
            detalles: detallesGuardados
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Ingreso Stock Error]:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al procesar el remito. Ingreso cancelado.' });
    } finally {
        client.release();
    }
};

// 2. Obtener el historial de remitos ingresados (GET)
export const obtenerIngresosStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT i.id_ingreso, i.fecha_ingreso, i.num_comprobante, i.id_proveedor,
                   p.nombre_empresa AS proveedor, 
                   u.nombre_usuario AS usuario_registro,
                   COUNT(di.id_detalle_ing) AS total_items,
                   COALESCE(SUM(di.cantidad * di.precio_costo), 0) AS monto_total_costo
            FROM Ingreso_Stock i
            INNER JOIN Proveedor p ON i.id_proveedor = p.id_proveedor
            INNER JOIN Usuario u ON i.id_usuario = u.id_usuario
            LEFT JOIN Detalle_Ingreso di ON i.id_ingreso = di.id_ingreso
            GROUP BY i.id_ingreso, i.fecha_ingreso, i.num_comprobante, i.id_proveedor, p.nombre_empresa, u.nombre_usuario
            ORDER BY i.id_ingreso DESC;
        `;
        const result = await pool.query(query);
        
        res.status(200).json({ total: result.rowCount, ingresos: result.rows });
    } catch (error) {
        console.error('[Ingreso Stock List Error]:', error);
        res.status(500).json({ error: 'Error al obtener el historial de remitos de mercadería' });
    }
};

// 3. Obtener detalle de un remito por ID (GET)
export const obtenerIngresoPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const queryCabecera = `
            SELECT i.id_ingreso, i.fecha_ingreso, i.num_comprobante,
                   p.nombre_empresa AS proveedor, p.telefono AS proveedor_telefono,
                   u.nombre_usuario AS usuario_registro
            FROM Ingreso_Stock i
            INNER JOIN Proveedor p ON i.id_proveedor = p.id_proveedor
            INNER JOIN Usuario u ON i.id_usuario = u.id_usuario
            WHERE i.id_ingreso = $1;
        `;
        const resultCabecera = await pool.query(queryCabecera, [id]);

        if (resultCabecera.rowCount === 0) {
            res.status(404).json({ error: 'Remito de ingreso no encontrado' });
            return;
        }

        const queryDetalles = `
            SELECT di.*, pr.nombre, pr.marca, pr.modelo, pr.tipo_prod
            FROM Detalle_Ingreso di
            INNER JOIN Productos pr ON di.id_producto = pr.id_producto
            WHERE di.id_ingreso = $1;
        `;
        const resultDetalles = await pool.query(queryDetalles, [id]);

        res.status(200).json({
            ingreso: resultCabecera.rows[0],
            productos_ingresados: resultDetalles.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar el remito de ingreso' });
    }
};