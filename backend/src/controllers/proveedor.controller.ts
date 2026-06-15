import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

// 1. Crear Proveedor
export const crearProveedor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nombre_empresa, cuit, telefono, email, direccion } = req.body;

        if (!nombre_empresa) {
            res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
            return;
        }

        const query = `
            INSERT INTO Proveedor (nombre_empresa, cuit, telefono, email, direccion)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await pool.query(query, [nombre_empresa, cuit, telefono, email, direccion]);

        res.status(201).json({
            message: 'Proveedor registrado exitosamente',
            proveedor: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el proveedor' });
    }
};

// 2. Obtener Proveedores
export const obtenerProveedores = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = 'SELECT * FROM Proveedor ORDER BY id_proveedor DESC';
        const result = await pool.query(query);
        res.status(200).json({ total: result.rowCount, proveedores: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener proveedores' });
    }
};

// 3. Buscar proveedor por ID (GET)
export const obtenerProveedorPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM Proveedor WHERE id_proveedor = $1';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Proveedor no encontrado' });
            return;
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el proveedor' });
    }
};

// 4. Actualizar Proveedor (PUT)
export const actualizarProveedor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre_empresa, cuit, telefono, email, direccion } = req.body;

        if (!nombre_empresa) {
            res.status(400).json({ error: 'El nombre de la empresa es requerido' });
            return;
        }

        const query = `
            UPDATE Proveedor 
            SET nombre_empresa = $1, cuit = $2, telefono = $3, email = $4, direccion = $5
            WHERE id_proveedor = $6
            RETURNING *;
        `;
        const result = await pool.query(query, [nombre_empresa, cuit, telefono, email, direccion, id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Proveedor no encontrado para actualizar' });
            return;
        }

        res.status(200).json({ message: 'Proveedor actualizado con éxito', proveedor: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el proveedor' });
    }
};

// 5. Eliminar Proveedor (DELETE)
export const eliminarProveedor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = 'DELETE FROM Proveedor WHERE id_proveedor = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Proveedor no encontrado para eliminar' });
            return;
        }

        res.status(200).json({ message: 'Proveedor eliminado correctamente del sistema' });
    } catch (error) {
        res.status(500).json({ 
            error: 'No se puede eliminar el proveedor', 
            detalle: 'Tiene remitos de ingreso de mercadería asociados.' 
        });
    }
};