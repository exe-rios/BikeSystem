import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

// 1. Obtener Métodos de Pago
export const obtenerMetodosPago = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = 'SELECT * FROM Metodo_Pago ORDER BY id_metodo_pago ASC';
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener métodos de pago' });
    }
};

// 2. Obtener Pagos a Proveedores
export const obtenerPagos = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                p.id_pago,
                p.id_proveedor,
                prov.nombre_empresa AS proveedor_nombre,
                p.id_usuario,
                u.nombre_usuario AS usuario_nombre,
                p.id_metodo_pago,
                mp.nombre AS metodo_pago_nombre,
                p.fecha,
                p.monto_total,
                p.observaciones
            FROM Pago_Proveedor p
            JOIN Proveedor prov ON p.id_proveedor = prov.id_proveedor
            JOIN Usuario u ON p.id_usuario = u.id_usuario
            JOIN Metodo_Pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            ORDER BY p.id_pago DESC
        `;
        const result = await pool.query(query);
        res.status(200).json({ total: result.rowCount, pagos: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los pagos' });
    }
};

// 3. Crear Pago
export const crearPago = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_proveedor, id_usuario, id_metodo_pago, monto_total, observaciones } = req.body;
        
        if (!id_proveedor || !id_usuario || !id_metodo_pago || monto_total === undefined) {
            res.status(400).json({ error: 'Faltan datos obligatorios (id_proveedor, id_usuario, id_metodo_pago, monto_total)' });
            return;
        }

        const query = `
            INSERT INTO Pago_Proveedor (id_proveedor, id_usuario, id_metodo_pago, monto_total, observaciones)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [id_proveedor, id_usuario, id_metodo_pago, monto_total, observaciones];

        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'Pago registrado exitosamente',
            pago: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el pago al proveedor' });
    }
};
