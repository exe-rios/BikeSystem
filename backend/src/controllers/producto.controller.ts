import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

// 1. Crear un nuevo producto (POST)
export const crearProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extraemos todos los campos posibles según tu tabla
        const { nombre, marca, modelo, tipo_prod, cantidad, numero_serie, color, rodado, talle, precio, stock_minimo } = req.body;

        // Validamos solo lo que definiste como NOT NULL en tu script SQL
        if (!nombre || !tipo_prod) {
            res.status(400).json({ error: 'Faltan datos obligatorios (nombre, tipo_prod)' });
            return;
        }

        const query = `
            INSERT INTO Productos (nombre, marca, modelo, tipo_prod, cantidad, numero_serie, color, rodado, talle, precio, stock_minimo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        
        // Si no mandan cantidad o precio, le ponemos 0 por defecto para que no explote
        const result = await pool.query(query, [
            nombre, marca, modelo, tipo_prod, 
            cantidad || 0, numero_serie, color, rodado, talle, 
            precio || 0, stock_minimo || 0
        ]);

        res.status(201).json({
            message: 'Producto ingresado al inventario con éxito',
            producto: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el producto en la base de datos' });
    }
};

// 2. Consultar el inventario completo (GET)
export const obtenerProductos = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = 'SELECT * FROM Productos ORDER BY id_producto DESC';
        const result = await pool.query(query);
        res.status(200).json({ total: result.rowCount, productos: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el inventario' });
    }
};

// 3. Buscar un producto específico por ID (GET)
export const obtenerProductoPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM Productos WHERE id_producto = $1';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Producto no encontrado' });
            return;
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el producto' });
    }
};

// 4. Actualizar datos de un producto (PUT)
export const actualizarProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre, marca, modelo, tipo_prod, cantidad, numero_serie, color, rodado, talle, precio, stock_minimo } = req.body;

        if (!nombre || !tipo_prod) {
            res.status(400).json({ error: 'El nombre y el tipo_prod son obligatorios para actualizar' });
            return;
        }

        const query = `
            UPDATE Productos 
            SET nombre = $1, marca = $2, modelo = $3, tipo_prod = $4, cantidad = $5, 
                numero_serie = $6, color = $7, rodado = $8, talle = $9, precio = $10, stock_minimo = $11
            WHERE id_producto = $12
            RETURNING *;
        `;
        const result = await pool.query(query, [
            nombre, marca, modelo, tipo_prod, cantidad, numero_serie, 
            color, rodado, talle, precio, stock_minimo, id
        ]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Producto no encontrado para actualizar' });
            return;
        }

        res.status(200).json({ message: 'Producto actualizado con éxito', producto: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
};

// 5. Eliminar un producto (DELETE)
export const eliminarProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = 'DELETE FROM Productos WHERE id_producto = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Producto no encontrado para eliminar' });
            return;
        }

        res.status(200).json({ message: 'Producto eliminado del sistema' });
    } catch (error) {
        // Tu RESTRICT en la BD va a saltar acá si intentan borrar una cámara que ya se usó en una reparación
        res.status(500).json({ 
            error: 'No se puede eliminar el producto.',
            detalle: 'Es posible que este producto ya esté asociado a una venta o reparación.'
        });
    }
};