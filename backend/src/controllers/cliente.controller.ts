import type { Request, Response } from 'express';
import { pool } from '../config/db.js'; 

// 1. Crear un nuevo cliente (POST)
export const crearCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nombre, apellido, dni, telefono, email, direccion } = req.body;

        if (!nombre || !apellido || !dni || !telefono || !email || !direccion) {
            res.status(400).json({ error: 'Faltan datos obligatorios (nombre, apellido, dni, telefono, email, direccion)' });
            return;
        }

        const query = `
            INSERT INTO Cliente (nombre, apellido, dni, telefono, email, direccion)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await pool.query(query, [nombre, apellido, dni, telefono, email, direccion]);

        res.status(201).json({
            message: 'Cliente registrado con éxito',
            cliente: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el cliente en la base de datos' });
    }
};

// 2. Consultar la lista de clientes (GET)
export const obtenerClientes = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = 'SELECT * FROM Cliente ORDER BY id_cliente DESC';
        const result = await pool.query(query);
        
        res.status(200).json({ total: result.rowCount, clientes: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la lista de clientes' });
    }
};

// 3. NUEVO: Buscar un cliente específico por su ID (GET)
export const obtenerClientePorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // Sacamos el ID de la URL
        const query = 'SELECT * FROM Cliente WHERE id_cliente = $1';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }
        
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el cliente en la base de datos' });
    }
};

// 4. NUEVO: Actualizar los datos de un cliente (PUT)
export const actualizarCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre, apellido, dni, telefono, email, direccion } = req.body;

        if (!nombre || !apellido || !dni || !telefono || !email || !direccion) {
            res.status(400).json({ error: 'Faltan datos obligatorios para actualizar' });
            return;
        }

        const query = `
            UPDATE Cliente 
            SET nombre = $1, apellido = $2, dni = $3, telefono = $4, email = $5, direccion = $6
            WHERE id_cliente = $7
            RETURNING *;
        `;
        const result = await pool.query(query, [nombre, apellido, dni, telefono, email, direccion, id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Cliente no encontrado para actualizar' });
            return;
        }

        res.status(200).json({
            message: 'Cliente actualizado con éxito',
            cliente: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
};

// 5. NUEVO: Eliminar un cliente (DELETE)
export const eliminarCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = 'DELETE FROM Cliente WHERE id_cliente = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Cliente no encontrado para eliminar' });
            return;
        }

        res.status(200).json({ message: 'Cliente eliminado correctamente del sistema' });
    } catch (error) {
        // En el futuro, si el cliente tiene bicicletas en el taller, PostgreSQL no te va a dejar borrarlo 
        // por la Clave Foránea. Por eso capturamos ese posible error acá.
        res.status(500).json({ 
            error: 'Error al eliminar el cliente.', 
            detalle: 'Es posible que tenga operaciones registradas en el sistema.' 
        });
    }
};