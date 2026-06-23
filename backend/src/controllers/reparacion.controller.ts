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

        // No se requiere id_cliente: la bicicleta es suficiente

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

// 3. Obtener una reparación específica por ID junto con todos sus repuestos asociados (GET)
export const obtenerReparacionPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        // Buscamos la cabecera de la reparación
        const queryCabecera = `
            SELECT r.*, b.marca, b.modelo, c.nombre, c.apellido
            FROM Reparacion r
            INNER JOIN Bicicleta b ON r.id_bicicleta = b.id_bicicleta
            INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
            WHERE r.id_reparacion = $1;
        `;
        const resultCabecera = await pool.query(queryCabecera, [id]);

        if (resultCabecera.rowCount === 0) {
            res.status(404).json({ error: 'Orden de reparación no encontrada' });
            return;
        }

        // Buscamos los repuestos vinculados en Detalle_Reparacion
        const queryDetalles = `
            SELECT dr.*, p.nombre, p.marca
            FROM Detalle_Reparacion dr
            INNER JOIN Productos p ON dr.id_producto = p.id_producto
            WHERE dr.id_reparacion = $1;
        `;
        const resultDetalles = await pool.query(queryDetalles, [id]);

        res.status(200).json({
            reparacion: resultCabecera.rows[0],
            repuestos_utilizados: resultDetalles.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar el detalle de la reparación' });
    }
};

// 4. Cambiar el estado de la reparación y actualizar costos (PUT)
// Vital para pasar de "En espera" a "En reparación", "Terminada" o "Entregada"
export const actualizarEstadoReparacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { estado, descripcion, costo_mano_obra } = req.body;

        if (!estado) {
            res.status(400).json({ error: 'El estado es obligatorio' });
            return;
        }

        // Si el estado pasa a ser "Terminada" o "Entregada", podríamos registrar automáticamente la fecha_egreso
        let fechaEgresoQuery = '';
        if (estado === 'Terminada' || estado === 'Entregada') {
            fechaEgresoQuery = `, fecha_egreso = CURRENT_DATE`;
        }

        const query = `
            UPDATE Reparacion 
            SET estado = $1, 
                descripcion = $2, 
                costo_mano_obra = $3,
                costo_total = (SELECT COALESCE(SUM(costo_total), 0) FROM Detalle_Reparacion WHERE id_reparacion = $4) + $3
                ${fechaEgresoQuery}
            WHERE id_reparacion = $4
            RETURNING *;
        `;
        
        const result = await pool.query(query, [estado, descripcion, costo_mano_obra || 0, id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Reparación no encontrada' });
            return;
        }

        res.status(200).json({ message: 'Estado y costos de la orden actualizados', reparacion: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el estado del taller' });
    }
};