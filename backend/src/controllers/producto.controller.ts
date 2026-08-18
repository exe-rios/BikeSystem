import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

// 1. Crear un nuevo producto (POST)
export const crearProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extraemos todos los campos posibles según tu tabla
        const { nombre, marca, modelo, tipo_prod, cantidad, numero_serie, color, rodado, talle, precio, stock_minimo, activo } = req.body;

        // Validamos solo lo que definiste como NOT NULL en tu script SQL
        if (!nombre || !tipo_prod) {
            res.status(400).json({ error: 'Faltan datos obligatorios (nombre, tipo_prod)' });
            return;
        }

        const estadoActivo = activo !== undefined ? Boolean(activo) : true;

        const query = `
            INSERT INTO Productos (nombre, marca, modelo, tipo_prod, cantidad, numero_serie, color, rodado, talle, precio, stock_minimo, activo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;
        
        // Si no mandan cantidad o precio, le ponemos 0 por defecto para que no explote
        const result = await pool.query(query, [
            nombre, marca, modelo, tipo_prod, 
            cantidad || 0, numero_serie, color, rodado, talle, 
            precio || 0, stock_minimo || 0, estadoActivo
        ]);

        res.status(201).json({
            message: 'Producto ingresado al inventario con éxito',
            producto: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el producto en la base de datos' });
    }
};

// 2. Consultar el inventario completo (GET) - Soporta ?solo_activos=true
export const obtenerProductos = async (req: Request, res: Response): Promise<void> => {
    try {
        const { solo_activos } = req.query;
        let query = 'SELECT * FROM Productos';
        
        if (solo_activos === 'true') {
            query += ' WHERE activo = true';
        }

        query += ' ORDER BY id_producto DESC';

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
        const { nombre, marca, modelo, tipo_prod, cantidad, numero_serie, color, rodado, talle, precio, stock_minimo, activo } = req.body;

        if (!nombre || !tipo_prod) {
            res.status(400).json({ error: 'El nombre y el tipo_prod son obligatorios para actualizar' });
            return;
        }

        const query = `
            UPDATE Productos 
            SET nombre = $1, marca = $2, modelo = $3, tipo_prod = $4, cantidad = $5, 
                numero_serie = $6, color = $7, rodado = $8, talle = $9, precio = $10, 
                stock_minimo = $11, activo = COALESCE($12, activo)
            WHERE id_producto = $13
            RETURNING *;
        `;
        const result = await pool.query(query, [
            nombre, marca, modelo, tipo_prod, cantidad, numero_serie, 
            color, rodado, talle, precio, stock_minimo, activo !== undefined ? Boolean(activo) : null, id
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

// 5. Borrado Lógico (Soft Delete) de un producto (DELETE)
export const eliminarProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = 'UPDATE Productos SET activo = false WHERE id_producto = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Producto no encontrado para dar de baja' });
            return;
        }

        res.status(200).json({ 
            message: 'Producto dado de baja (desactivado) exitosamente del inventario',
            producto: result.rows[0] 
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al procesar la baja del producto en el sistema.' 
        });
    }
};

// 6. Reactivar un producto dado de baja (PUT / PATCH)
export const reactivarProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = 'UPDATE Productos SET activo = true WHERE id_producto = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Producto no encontrado para reactivar' });
            return;
        }

        res.status(200).json({ 
            message: 'Producto reactivado exitosamente en el catálogo',
            producto: result.rows[0] 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al reactivar el producto en el sistema' });
    }
};