import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';

// 1. Ingresar bicicleta al taller (POST)
export const crearReparacion = async (req: PeticionConUsuario, res: Response): Promise<void> => {
    try {
        const id_usuario = req.usuarioToken?.id || req.body.id_usuario;
        const { id_bicicleta, estado, descripcion, costo_mano_obra } = req.body;

        if (!id_bicicleta || !id_usuario || !estado) {
            res.status(400).json({ error: 'Faltan datos obligatorios (id_bicicleta, id_usuario, estado)' });
            return;
        }

        const montoManoObra = Number(costo_mano_obra) || 0;

        // INSERT en la tabla Reparacion inicializando costo_mano_obra y costo_total con el mismo importe
        const query = `
            INSERT INTO Reparacion (id_bicicleta, id_usuario, estado, descripcion, costo_mano_obra, costo_total)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const result = await pool.query(query, [
            id_bicicleta,
            id_usuario,
            estado,
            descripcion || '',
            montoManoObra,
            montoManoObra
        ]);

        res.status(201).json({
            message: 'Bicicleta ingresada al taller con éxito',
            reparacion: result.rows[0]
        });
    } catch (error) {
        console.error('[Reparacion Error]:', error);
        res.status(500).json({ error: 'Error al registrar el ingreso al taller' });
    }
};

// 2. Obtener la lista de reparaciones para la pantalla principal (GET)
export const obtenerReparaciones = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT r.id_reparacion, r.fecha_ingreso, r.fecha_egreso, r.estado, r.descripcion, 
                   r.costo_mano_obra, r.costo_total,
                   b.id_bicicleta, b.marca, b.modelo, 
                   c.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
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
export const actualizarEstadoReparacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { estado, descripcion, costo_mano_obra } = req.body;

        if (!estado && descripcion === undefined && costo_mano_obra === undefined) {
            res.status(400).json({ error: 'Debe enviar al menos un campo para actualizar' });
            return;
        }

        let fechaEgresoQuery = '';
        if (estado === 'Terminada' || estado === 'Entregada') {
            fechaEgresoQuery = `, fecha_egreso = CURRENT_DATE`;
        }

        // Usamos COALESCE para preservar los valores existentes si no se envían
        const query = `
            UPDATE Reparacion 
            SET estado = COALESCE($1, estado), 
                descripcion = COALESCE($2, descripcion), 
                costo_mano_obra = COALESCE($3, costo_mano_obra),
                costo_total = (SELECT COALESCE(SUM(costo_total), 0) FROM Detalle_Reparacion WHERE id_reparacion = $4) + COALESCE($3, costo_mano_obra)
                ${fechaEgresoQuery}
            WHERE id_reparacion = $4
            RETURNING *;
        `;
        
        const result = await pool.query(query, [
            estado || null, 
            descripcion !== undefined ? descripcion : null, 
            costo_mano_obra !== undefined ? Number(costo_mano_obra) : null, 
            id
        ]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Reparación no encontrada' });
            return;
        }

        res.status(200).json({ message: 'Orden de taller actualizada exitosamente', reparacion: result.rows[0] });
    } catch (error) {
        console.error('[Reparacion Update Error]:', error);
        res.status(500).json({ error: 'Error al actualizar la orden del taller' });
    }
};