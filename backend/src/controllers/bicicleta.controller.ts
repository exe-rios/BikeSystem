import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

// 1. Registrar una Bicicleta (POST)
export const crearBicicleta = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_cliente, marca, modelo } = req.body;

        // Validamos que envíen los datos obligatorios
        if (!id_cliente || !marca) {
            res.status(400).json({ error: 'Faltan datos obligatorios (id_cliente, marca)' });
            return;
        }

        // INSERT en PostgreSQL usando los nombres exactos de tu script
        const query = `
            INSERT INTO Bicicleta (id_cliente, marca, modelo)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result = await pool.query(query, [id_cliente, marca, modelo]);

        res.status(201).json({
            message: 'Bicicleta registrada con éxito',
            bicicleta: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al registrar la bicicleta',
            detalle: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

// 2. Obtener todas las bicicletas con los datos de sus dueños (GET)
// Usamos un INNER JOIN para que Diego pueda ver de quién es cada bici directamente
export const obtenerBicicletas = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT b.*, c.nombre, c.apellido 
            FROM Bicicleta b
            INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
            ORDER BY b.id_bicicleta DESC;
        `;
        const result = await pool.query(query);
        
        res.status(200).json({ total: result.rowCount, bicicletas: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la lista de bicicletas' });
    }
};

// 3. Buscar una bicicleta por ID (GET)
export const obtenerBicicletaPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = `
            SELECT b.*, c.nombre, c.apellido 
            FROM Bicicleta b
            INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
            WHERE b.id_bicicleta = $1;
        `;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Bicicleta no encontrada' });
            return;
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar la bicicleta' });
    }
};

// 4. Actualizar datos de una bicicleta (PUT)
export const actualizarBicicleta = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { marca, modelo } = req.body;

        if (!marca) {
            res.status(400).json({ error: 'La marca es obligatoria para actualizar' });
            return;
        }

        const query = `
            UPDATE Bicicleta 
            SET marca = $1, modelo = $2
            WHERE id_bicicleta = $3
            RETURNING *;
        `;
        const result = await pool.query(query, [marca, modelo, id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Bicicleta no encontrada para actualizar' });
            return;
        }

        res.status(200).json({ message: 'Bicicleta actualizada con éxito', bicicleta: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la bicicleta' });
    }
};

// 5. Eliminar una bicicleta (DELETE)
export const eliminarBicicleta = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = 'DELETE FROM Bicicleta WHERE id_bicicleta = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Bicicleta no encontrada para eliminar' });
            return;
        }

        res.status(200).json({ message: 'Bicicleta eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ 
            error: 'No se puede eliminar la bicicleta', 
            detalle: 'Tiene órdenes de reparación registradas en el taller.' 
        });
    }
};