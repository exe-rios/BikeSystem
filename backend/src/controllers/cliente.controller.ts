import type { Request, Response } from 'express';
import { pool } from '../config/db.js';

// Helper de validación interna
const validarDatosCliente = (body: any) => {
    const { nombre, apellido, dni, telefono, email, direccion } = body;
    const errores: string[] = [];

    if (!nombre || nombre.trim().length < 2) errores.push('El nombre es obligatorio (mínimo 2 caracteres).');
    if (!apellido || apellido.trim().length < 2) errores.push('El apellido es obligatorio (mínimo 2 caracteres).');
    
    // Validación DNI argentino/estándar: solo números, entre 7 y 8 dígitos
    const dniLimpio = String(dni || '').trim();
    if (!/^\d{7,8}$/.test(dniLimpio)) errores.push('El DNI debe tener 7 u 8 dígitos numéricos sin puntos.');

    // Validación Email
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errores.push('El formato del correo electrónico no es válido.');
    }

    // Validación Teléfono (mínimo 7 dígitos)
    if (telefono && !/^\+?\d{7,15}$/.test(String(telefono).trim())) {
        errores.push('El teléfono debe contener entre 7 y 15 números.');
    }

    return errores;
};

// 1. Crear un nuevo cliente (POST)
export const crearCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const errores = validarDatosCliente(req.body);
        if (errores.length > 0) {
            res.status(400).json({ error: 'Errores de validación', detalles: errores });
            return;
        }

        const { nombre, apellido, dni, telefono, email, direccion } = req.body;

        // Verificar DNI duplicado antes de insertar
        const existeDni = await pool.query('SELECT id_cliente FROM Cliente WHERE dni = $1', [dni.trim()]);
        if (existeDni.rowCount && existeDni.rowCount > 0) {
            res.status(409).json({ error: 'Ya existe un cliente registrado con ese número de DNI.' });
            return;
        }

        const query = `
            INSERT INTO Cliente (nombre, apellido, dni, telefono, email, direccion)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await pool.query(query, [
            nombre.trim(),
            apellido.trim(),
            dni.trim(),
            telefono ? telefono.trim() : null,
            email ? email.trim().toLowerCase() : null,
            direccion ? direccion.trim() : null
        ]);

        res.status(201).json({
            message: 'Cliente registrado con éxito',
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('[CREAR CLIENTE ERROR]:', error);
        res.status(500).json({ error: 'Error al registrar el cliente en la base de datos' });
    }
};

// 2. Consultar la lista de clientes (GET)
export const obtenerClientes = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = 'SELECT * FROM Cliente ORDER BY id_cliente DESC';
        const result = await pool.query(query);
        
        // Devolvemos el array directamente para mantener estándar con Ventas y Productos
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[OBTENER CLIENTES ERROR]:', error);
        res.status(500).json({ error: 'Error al obtener la lista de clientes' });
    }
};

// 3. Buscar cliente por ID (GET)
export const obtenerClientePorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
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

// 4. Actualizar cliente (PUT)
export const actualizarCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const errores = validarDatosCliente(req.body);
        if (errores.length > 0) {
            res.status(400).json({ error: 'Errores de validación', detalles: errores });
            return;
        }

        const { nombre, apellido, dni, telefono, email, direccion } = req.body;

        // Verificar DNI duplicado en otro cliente
        const existeDni = await pool.query('SELECT id_cliente FROM Cliente WHERE dni = $1 AND id_cliente != $2', [dni.trim(), id]);
        if (existeDni.rowCount && existeDni.rowCount > 0) {
            res.status(409).json({ error: 'El DNI ingresado ya pertenece a otro cliente.' });
            return;
        }

        const query = `
            UPDATE Cliente 
            SET nombre = $1, apellido = $2, dni = $3, telefono = $4, email = $5, direccion = $6
            WHERE id_cliente = $7
            RETURNING *;
        `;
        const result = await pool.query(query, [
            nombre.trim(),
            apellido.trim(),
            dni.trim(),
            telefono ? telefono.trim() : null,
            email ? email.trim().toLowerCase() : null,
            direccion ? direccion.trim() : null,
            id
        ]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Cliente no encontrado para actualizar' });
            return;
        }

        res.status(200).json({
            message: 'Cliente actualizado con éxito',
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('[ACTUALIZAR CLIENTE ERROR]:', error);
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
};

// 5. Eliminar cliente (DELETE)
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
    } catch (error: any) {
        if (error.code === '23503') { // Código PostgreSQL de Foreign Key Violation
            res.status(400).json({ 
                error: 'No se puede eliminar el cliente.', 
                detalle: 'Tiene ventas o bicicletas asociadas en el sistema.' 
            });
            return;
        }
        res.status(500).json({ error: 'Error al eliminar el cliente del sistema' });
    }
};