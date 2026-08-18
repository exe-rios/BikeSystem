import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';

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

// 3. Crear Pago (Soporta id_proveedor existente o nombre_proveedor tipeado directamente)
export const crearPago = async (req: PeticionConUsuario, res: Response): Promise<void> => {
    try {
        const id_usuario = req.usuarioToken?.id || req.body.id_usuario || 1;
        const { id_proveedor, nombre_proveedor, id_metodo_pago, monto_total, observaciones } = req.body;
        
        if ((!id_proveedor && !nombre_proveedor) || !id_metodo_pago || monto_total === undefined || monto_total <= 0) {
            res.status(400).json({ error: 'Faltan datos obligatorios (proveedor, método de pago, monto total mayor a 0)' });
            return;
        }

        let proveedorIdFinal = id_proveedor;

        // Si el usuario escribió el nombre directamente
        if (nombre_proveedor && typeof nombre_proveedor === 'string' && nombre_proveedor.trim()) {
            const nombreLimpio = nombre_proveedor.trim();

            // Verificar si ya existe un proveedor con ese nombre (case insensitive)
            const queryBuscar = 'SELECT id_proveedor FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1)';
            const resBuscar = await pool.query(queryBuscar, [nombreLimpio]);

            if (resBuscar.rowCount && resBuscar.rowCount > 0) {
                proveedorIdFinal = resBuscar.rows[0].id_proveedor;
            } else {
                // Crear automáticamente el proveedor en la base de datos
                const queryCrearProv = 'INSERT INTO Proveedor (nombre_empresa) VALUES ($1) RETURNING id_proveedor';
                const resCrear = await pool.query(queryCrearProv, [nombreLimpio]);
                proveedorIdFinal = resCrear.rows[0].id_proveedor;
            }
        }

        const query = `
            INSERT INTO Pago_Proveedor (id_proveedor, id_usuario, id_metodo_pago, monto_total, observaciones)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [proveedorIdFinal, id_usuario, id_metodo_pago, monto_total, observaciones || null];

        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'Pago registrado exitosamente',
            pago: result.rows[0]
        });
    } catch (error) {
        console.error('[Pago Proveedor Error]:', error);
        res.status(500).json({ error: 'Error al registrar el pago al proveedor' });
    }
};
