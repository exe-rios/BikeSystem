import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';
import { EMAIL_REGEX, validarId } from '../utils/validation.js';

/** Servicio de gestión y registro de proveedores comerciales. */
export class ProveedorService {
  /** Obtiene listado de proveedores con filtro opcional de búsqueda por nombre, CUIT o datos de contacto. */
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

  /** Obtiene la información de un proveedor por su ID. */
  static async obtenerProveedorPorId(id: number) {
    validarId(id, 'No se encontró ese proveedor.');

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

  /** Registra un nuevo proveedor validando unicidad por nombre de empresa. */
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

    const nombreLimpio = nombre_empresa.trim();

    // Validar unicidad insensible a mayúsculas
    const checkDup = await pool.query('SELECT id_proveedor FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1);', [nombreLimpio]);
    if (checkDup.rowCount && checkDup.rowCount > 0) {
      throw new ConflictError(`Ya existe un proveedor registrado con el nombre "${nombreLimpio}".`);
    }

    const cuitLimpio = cuit && String(cuit).trim().length > 0 ? String(cuit).trim() : null;
    const emailLimpio = email && String(email).trim().length > 0 ? String(email).trim() : null;
    const telefonoLimpio = telefono && String(telefono).trim().length > 0 ? String(telefono).trim() : null;
    const direccionLimpia = direccion && String(direccion).trim().length > 0 ? String(direccion).trim() : null;

    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: nombre@correo.com');
    }

    const query = `
      INSERT INTO Proveedor (nombre_empresa, cuit, telefono, email, direccion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      nombreLimpio,
      cuitLimpio,
      telefonoLimpio,
      emailLimpio,
      direccionLimpia
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

  /** Modifica los datos de contacto y razón social del proveedor. */
  static async actualizarProveedor(id: number, datos: {
    nombre_empresa?: string | undefined;
    cuit?: string | undefined;
    telefono?: string | undefined;
    email?: string | undefined;
    direccion?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    validarId(id, 'No se encontró ese proveedor.');

    const { nombre_empresa, cuit, telefono, email, direccion, idUsuarioOperador, nombreUsuarioOperador } = datos;

    const check = await pool.query('SELECT id_proveedor, nombre_empresa FROM Proveedor WHERE id_proveedor = $1;', [id]);
    if (check.rowCount === 0) {
      throw new NotFoundError('Ese proveedor no existe.');
    }

    let nombreFinal = check.rows[0].nombre_empresa;
    if (nombre_empresa !== undefined) {
      if (typeof nombre_empresa !== 'string' || nombre_empresa.trim().length < 2) {
        throw new BadRequestError('El nombre de la empresa debe tener al menos 2 letras.');
      }
      nombreFinal = nombre_empresa.trim();

      // Validar que el nuevo nombre no esté duplicado en otro proveedor
      const checkDup = await pool.query(
        'SELECT id_proveedor FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1) AND id_proveedor != $2;',
        [nombreFinal, id]
      );
      if (checkDup.rowCount && checkDup.rowCount > 0) {
        throw new ConflictError(`Ya existe otro proveedor registrado con el nombre "${nombreFinal}".`);
      }
    }

    const emailLimpio = email !== undefined ? (email && String(email).trim().length > 0 ? String(email).trim() : null) : undefined;
    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: contacto@empresa.com');
    }

    const query = `
      UPDATE Proveedor
      SET nombre_empresa = $1,
          cuit = CASE WHEN $2::boolean THEN $3 ELSE cuit END,
          telefono = CASE WHEN $4::boolean THEN $5 ELSE telefono END,
          email = CASE WHEN $6::boolean THEN $7 ELSE email END,
          direccion = CASE WHEN $8::boolean THEN $9 ELSE direccion END
      WHERE id_proveedor = $10
      RETURNING *;
    `;
    const result = await pool.query(query, [
      nombreFinal,
      cuit !== undefined,
      cuit && String(cuit).trim().length > 0 ? String(cuit).trim() : null,
      telefono !== undefined,
      telefono && String(telefono).trim().length > 0 ? String(telefono).trim() : null,
      email !== undefined,
      emailLimpio ?? null,
      direccion !== undefined,
      direccion && String(direccion).trim().length > 0 ? String(direccion).trim() : null,
      id
    ]);
    const provActualizado = result.rows[0];

    // Registrar en Bitacora_Actividad
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

  /** Da de baja al proveedor si no posee pagos registrados. */
  static async eliminarProveedor(id: number, operador: {
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    validarId(id, 'No se encontró ese proveedor.');

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;

    const resProv = await pool.query('SELECT nombre_empresa FROM Proveedor WHERE id_proveedor = $1;', [id]);
    if (resProv.rowCount === 0) {
      throw new NotFoundError('Ese proveedor no existe.');
    }
    const datosProv = resProv.rows[0];

    // Verificar si tiene pagos asociados para evitar fallo 500 de clave foránea en PostgreSQL
    const checkPagos = await pool.query('SELECT COUNT(*)::int AS pagos_count FROM Pago_Proveedor WHERE id_proveedor = $1;', [id]);
    const pagosCount = checkPagos.rows[0]?.pagos_count || 0;
    if (pagosCount > 0) {
      throw new ConflictError(`No se puede eliminar el proveedor porque posee ${pagosCount} pago(s) registrado(s) en el sistema.`);
    }

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
