import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';

// 1. Crear Venta (Soporta transacción atómica con array de detalles o cabecera simple)
export const crearVenta = async (req: PeticionConUsuario, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
        const id_usuario = req.usuarioToken?.id || req.body.id_usuario;
        const { id_cliente, detalles } = req.body;

        if (!id_cliente || !id_usuario) {
            res.status(400).json({ error: 'Faltan datos obligatorios (id_cliente, id_usuario)' });
            return;
        }

        // Si se envió el array de detalles, procesamos la venta completa atómicamente
        if (Array.isArray(detalles) && detalles.length > 0) {
            await client.query('BEGIN');

            // A. Crear cabecera inicial con costo_total = 0
            const queryVenta = `
                INSERT INTO Venta (id_cliente, id_usuario, costo_total)
                VALUES ($1, $2, 0)
                RETURNING *;
            `;
            const resultVenta = await client.query(queryVenta, [id_cliente, id_usuario]);
            const ventaCreada = resultVenta.rows[0];
            const id_venta = ventaCreada.id_venta;

            let costoTotalCalculado = 0;
            const detallesGuardados = [];

            // B. Procesar cada producto del detalle
            for (const item of detalles) {
                const { id_producto, cantidad, precio_unitario } = item;

                if (!id_producto || !cantidad || cantidad <= 0 || precio_unitario === undefined) {
                    throw new Error('Datos de detalle inválidos');
                }

                // Validar stock disponible y tipo de producto
                const queryProducto = `
                    SELECT id_producto, nombre, marca, modelo, tipo_prod, cantidad 
                    FROM Productos 
                    WHERE id_producto = $1
                `;
                const resultProd = await client.query(queryProducto, [id_producto]);

                if (resultProd.rowCount === 0) {
                    throw new Error(`Producto ID ${id_producto} no encontrado`);
                }

                const producto = resultProd.rows[0];

                if (producto.cantidad < cantidad) {
                    throw new Error(`Stock insuficiente para "${producto.nombre}". Disponible: ${producto.cantidad}, solicitado: ${cantidad}`);
                }

                const subtotal = cantidad * precio_unitario;
                costoTotalCalculado += subtotal;

                // Insertar Detalle_Venta
                const queryDetalle = `
                    INSERT INTO Detalle_Venta (id_venta, id_producto, cantidad, precio_unitario, costo_total)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
                const resultDetalle = await client.query(queryDetalle, [id_venta, id_producto, cantidad, precio_unitario, subtotal]);
                detallesGuardados.push(resultDetalle.rows[0]);

                // Descontar stock
                const queryDescuento = `
                    UPDATE Productos 
                    SET cantidad = cantidad - $1 
                    WHERE id_producto = $2;
                `;
                await client.query(queryDescuento, [cantidad, id_producto]);

                // Si el producto vendido es una bicicleta, registrarla opcionalmente en Bicicleta del cliente
                if (producto.tipo_prod === 'bicicleta') {
                    const queryBiciCliente = `
                        INSERT INTO Bicicleta (id_cliente, marca, modelo)
                        VALUES ($1, $2, $3)
                    `;
                    await client.query(queryBiciCliente, [
                        id_cliente,
                        producto.marca || producto.nombre,
                        producto.modelo || 'Bicicleta nueva'
                    ]);
                }
            }

            // C. Actualizar el costo_total final de la Venta
            const queryActualizarTotal = `
                UPDATE Venta 
                SET costo_total = $1 
                WHERE id_venta = $2
                RETURNING *;
            `;
            const resultTotal = await client.query(queryActualizarTotal, [costoTotalCalculado, id_venta]);

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Venta registrada con éxito',
                venta: resultTotal.rows[0],
                detalles: detallesGuardados
            });
            return;
        }

        // Flujo tradicional: solo crear cabecera
        const query = `
            INSERT INTO Venta (id_cliente, id_usuario, costo_total)
            VALUES ($1, $2, 0)
            RETURNING *;
        `;
        const result = await client.query(query, [id_cliente, id_usuario]);

        res.status(201).json({
            message: 'Ticket de venta iniciado correctamente',
            venta: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Error al procesar la venta' 
        });
    } finally {
        client.release();
    }
};

// 2. Agregar un producto a la venta (POST) - TRANSACCIÓN INDIVIDUAL
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

        // B. Descontar el stock
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
            SELECT v.id_venta, v.fecha, v.costo_total, v.id_cliente,
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
            SELECT v.*, 
                   c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, 
                   c.dni AS cliente_dni, c.telefono AS cliente_telefono, 
                   c.email AS cliente_email, c.direccion AS cliente_direccion,
                   u.nombre_usuario AS vendedor
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
            SELECT dv.*, p.nombre, p.marca, p.modelo, p.tipo_prod, p.numero_serie, p.color, p.rodado, p.talle
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