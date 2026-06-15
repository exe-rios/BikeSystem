import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

// 1. Ingresar bicicleta al taller (POST)
export const crearReparacion = async (req: Request, res: Response): Promise<void> => {
    try {
        // Obtenemos los datos iniciales del ingreso
        const { id_bicicleta, id_usuario, estado, descripcion, costo_mano_obra } = req.body;

        // Validaciones obligatorias
        if (!id_bicicleta || !id_usuario || !estado) {
            res.status(400).json({ error: 'Faltan datos obligatorios (id_bicicleta, id_usuario, estado)' });
            return;
        }

        // INSERT en la tabla Reparacion (La fecha_ingreso se pone sola gracias al DEFAULT CURRENT_DATE)
        const query = `
            INSERT INTO Reparacion (id_bicicleta, id_usuario, estado, descripcion, costo_mano_obra)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const result = await pool.query(query, [
            id_bicicleta,
            id_usuario,
            estado,
            descripcion,
            costo_mano_obra || 0
        ]);

        res.status(201).json({
            message: 'Bicicleta ingresada al taller con éxito',
            reparacion: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el ingreso al taller' });
    }
};

// 2. Obtener la lista de reparaciones para la pantalla principal (GET)
export const obtenerReparaciones = async (req: Request, res: Response): Promise<void> => {
    try {
        // Super JOIN para traer toda la info útil de un solo golpe
        const query = `
            SELECT r.id_reparacion, r.fecha_ingreso, r.estado, r.descripcion, r.costo_total,
                   b.marca, b.modelo, 
                   c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
            FROM Reparacion r
            INNER JOIN Bicicleta b ON r.id_bicicleta = b.id_bicicleta
            INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
            ORDER BY r.id_reparacion DESC;
        `;
        const result = await pool.query(query);

        res.status(200).json({ total: result.rowCount, reparaciones: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la lista del taller' });
    }
};