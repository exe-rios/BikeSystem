import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ProveedorService {
  static async obtenerProveedores(busqueda?: string | undefined) {
    let query = `
      SELECT id_proveedor, nombre_empresa, cuit, telefono, email, direccion
      FROM Proveedor
    `;

    const params: any[] = [];
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` WHERE (
        nombre_empresa ILIKE $1 OR 
        cuit ILIKE $1 OR 
        telefono ILIKE $1 OR 
        email ILIKE $1 OR 
        CAST(id_proveedor AS TEXT) ILIKE $1
      )`;
      params.push(term);
    }

    query += ` ORDER BY id_proveedor DESC;`;

    const result = await pool.query(query, params);
    return {
      total: result.rowCount || 0,
      proveedores: result.rows
    };
  }

  static async obtenerProveedorPorId(id: number) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese proveedor.');
    }

    const query = `
      SELECT id_proveedor, nombre_empresa, cuit, telefono, email, direccion
      FROM Proveedor
      WHERE id_proveedor = $1;
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Ese proveedor no existe.');
    }

    return result.rows[0];
  }

  static async crearProveedor(datos: {
    nombre_empresa: string;
    cuit?: string | undefined;
    telefono?: string | undefined;
    email?: string | undefined;
    direccion?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const { nombre_empresa, cuit, telefono, email, direccion, idUsuarioOperador, nombreUsuarioOperador } = datos;

    if (!nombre_empresa || typeof nombre_empresa !== 'string' || nombre_empresa.trim().length < 2) {
      throw new BadRequestError('Escribí el nombre de la empresa (al menos 2 letras).');
    }

    const cuitLimpio = cuit ? String(cuit).trim() : null;
    const emailLimpio = email ? String(email).trim() : null;

    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: nombre@correo.com');
    }

    const query = `
      INSERT INTO Proveedor (nombre_empresa, cuit, telefono, email, direccion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      nombre_empresa.trim(),
      cuitLimpio,
      telefono ? String(telefono).trim() : null,
      emailLimpio,
      direccion ? String(direccion).trim() : null
    ]);

    const nuevoProveedor = result.rows[0];

    // Registrar en Bitácora
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Proveedores', 'Alta de Proveedor', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Proveedor registrado: "${nuevoProveedor.nombre_empresa}" (ID #${nuevoProveedor.id_proveedor}).`
        ]
      );
    } catch {
      // Ignorar
    }

    return nuevoProveedor;
  }

  static async actualizarProveedor(id: number, datos: {
    nombre_empresa?: string | undefined;
    cuit?: string | undefined;
    telefono?: string | undefined;
    email?: string | undefined;
    direccion?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese proveedor.');
    }

    const { nombre_empresa, cuit, telefono, email, direccion, idUsuarioOperador, nombreUsuarioOperador } = datos;

    const check = await pool.query('SELECT id_proveedor FROM Proveedor WHERE id_proveedor = $1;', [id]);
    if (check.rowCount === 0) {
      throw new NotFoundError('Ese proveedor no existe.');
    }

    if (nombre_empresa !== undefined && (typeof nombre_empresa !== 'string' || nombre_empresa.trim().length < 2)) {
      throw new BadRequestError('El nombre de la empresa debe tener al menos 2 letras.');
    }

    const emailLimpio = email ? String(email).trim() : null;
    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: nombre@correo.com');
    }

    const query = `
      UPDATE Proveedor
      SET nombre_empresa = COALESCE($1, nombre_empresa),
          cuit = COALESCE($2, cuit),
          telefono = COALESCE($3, telefono),
          email = COALESCE($4, email),
          direccion = COALESCE($5, direccion)
      WHERE id_proveedor = $6
      RETURNING *;
    `;
    const result = await pool.query(query, [
      nombre_empresa ? nombre_empresa.trim() : null,
      cuit !== undefined ? (cuit ? String(cuit).trim() : null) : null,
      telefono !== undefined ? (telefono ? String(telefono).trim() : null) : null,
      email !== undefined ? emailLimpio : null,
      direccion !== undefined ? (direccion ? String(direccion).trim() : null) : null,
      id
    ]);

    const provActualizado = result.rows[0];

    // Registrar en Bitácora
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Proveedores', 'Modificación de Proveedor', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Proveedor actualizado: "${provActualizado.nombre_empresa}" (ID #${id}).`
        ]
      );
    } catch {
      // Ignorar
    }

    return provActualizado;
  }

  static async eliminarProveedor(id: number, operador: {
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese proveedor.');
    }

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;

    const resProv = await pool.query('SELECT nombre_empresa FROM Proveedor WHERE id_proveedor = $1;', [id]);
    if (resProv.rowCount === 0) {
      throw new NotFoundError('Ese proveedor no existe.');
    }
    const datosProv = resProv.rows[0];

    await pool.query('DELETE FROM Proveedor WHERE id_proveedor = $1;', [id]);

    // Registrar en Bitácora
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Proveedores', 'Baja de Proveedor', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Proveedor eliminado: "${datosProv.nombre_empresa}" (ID #${id}).`
        ]
      );
    } catch {
      // Ignorar
    }

    return { message: 'Proveedor eliminado correctamente' };
  }
}
