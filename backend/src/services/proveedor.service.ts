import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError, ConflictError, UnauthorizedError } from '../utils/errors.js';
import { EMAIL_REGEX, validarId } from '../utils/validation.js';

/** Servicio de gestión y registro de proveedores comerciales. */
export class ProveedorService {
  /** Obtiene listado de proveedores con su cotización de dólar propia y cantidad de productos en USD. */
  static async obtenerProveedores(busqueda?: string | undefined) {
    let query = `
      SELECT pr.id_proveedor, pr.nombre_empresa, pr.cuit, pr.telefono, pr.email, pr.direccion, pr.cotizacion_dolar,
             COUNT(p.id_producto) FILTER (WHERE p.activo = true)::INT AS productos_count,
             COUNT(p.id_producto) FILTER (WHERE p.activo = true AND p.moneda = 'USD')::INT AS productos_usd_count
      FROM Proveedor pr
      LEFT JOIN Productos p ON pr.id_proveedor = p.id_proveedor
    `;

    const params: any[] = [];
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` WHERE (
        pr.nombre_empresa ILIKE $1 OR 
        pr.cuit ILIKE $1 OR 
        pr.telefono ILIKE $1 OR 
        pr.email ILIKE $1 OR 
        CAST(pr.id_proveedor AS TEXT) ILIKE $1
      )`;
      params.push(term);
    }

    query += ` GROUP BY pr.id_proveedor ORDER BY pr.id_proveedor DESC;`;

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
      SELECT id_proveedor, nombre_empresa, cuit, telefono, email, direccion, cotizacion_dolar
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
    cotizacion_dolar?: number | string | null | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const { nombre_empresa, cuit, telefono, email, direccion, cotizacion_dolar, idUsuarioOperador, nombreUsuarioOperador } = datos;

    if (!nombre_empresa || typeof nombre_empresa !== 'string' || nombre_empresa.trim().length < 2) {
      throw new BadRequestError('Escribí el nombre de la empresa (al menos 2 letras).');
    }

    const nombreLimpio = nombre_empresa.trim();

    // Validar unicidad insensible a mayúsculas
    const checkDup = await pool.query('SELECT id_proveedor FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1);', [nombreLimpio]);
    if (checkDup.rowCount && checkDup.rowCount > 0) {
      throw new ConflictError(`Ya existe un proveedor registrado con el nombre "${nombreLimpio}".`);
    }

    if (nombreLimpio.length > 70) {
      throw new BadRequestError('El nombre de la empresa no puede superar los 70 caracteres.');
    }

    const cuitLimpio = cuit && String(cuit).trim().length > 0 ? String(cuit).trim() : null;
    if (cuitLimpio && cuitLimpio.length > 20) {
      throw new BadRequestError('El CUIT no puede superar los 20 caracteres.');
    }

    const emailLimpio = email && String(email).trim().length > 0 ? String(email).trim() : null;
    if (emailLimpio && emailLimpio.length > 70) {
      throw new BadRequestError('El email no puede superar los 70 caracteres.');
    }
    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: nombre@correo.com');
    }

    const telefonoLimpio = telefono && String(telefono).trim().length > 0 ? String(telefono).trim() : null;
    if (telefonoLimpio && telefonoLimpio.length > 20) {
      throw new BadRequestError('El teléfono no puede superar los 20 caracteres.');
    }

    const direccionLimpia = direccion && String(direccion).trim().length > 0 ? String(direccion).trim() : null;
    if (direccionLimpia && direccionLimpia.length > 70) {
      throw new BadRequestError('La dirección no puede superar los 70 caracteres.');
    }

    let cotizacionInicial: number | null = null;
    if (cotizacion_dolar !== undefined && cotizacion_dolar !== null && cotizacion_dolar !== '') {
      const cotNum = Number(cotizacion_dolar);
      if (isNaN(cotNum) || !isFinite(cotNum) || cotNum <= 0) {
        throw new BadRequestError('La cotización inicial del dólar debe ser mayor a 0.');
      }
      if (cotNum > 99999999.99) {
        throw new BadRequestError('La cotización del dólar no puede superar $99.999.999,99.');
      }
      cotizacionInicial = Math.round(cotNum * 100) / 100;
    }

    const query = cotizacionInicial !== null
      ? `
        INSERT INTO Proveedor (nombre_empresa, cuit, telefono, email, direccion, cotizacion_dolar)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `
      : `
        INSERT INTO Proveedor (nombre_empresa, cuit, telefono, email, direccion)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
    const paramsInsert = [
      nombreLimpio,
      cuitLimpio,
      telefonoLimpio,
      emailLimpio,
      direccionLimpia
    ];
    if (cotizacionInicial !== null) {
      paramsInsert.push(String(cotizacionInicial));
    }
    const result = await pool.query(query, paramsInsert);

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
      if (nombreFinal.length > 70) {
        throw new BadRequestError('El nombre de la empresa no puede superar los 70 caracteres.');
      }

      // Validar que el nuevo nombre no esté duplicado en otro proveedor
      const checkDup = await pool.query(
        'SELECT id_proveedor FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1) AND id_proveedor != $2;',
        [nombreFinal, id]
      );
      if (checkDup.rowCount && checkDup.rowCount > 0) {
        throw new ConflictError(`Ya existe otro proveedor registrado con el nombre "${nombreFinal}".`);
      }
    }

    if (cuit !== undefined && typeof cuit === 'string' && cuit.trim().length > 20) {
      throw new BadRequestError('El CUIT no puede superar los 20 caracteres.');
    }

    if (telefono !== undefined && typeof telefono === 'string' && telefono.trim().length > 20) {
      throw new BadRequestError('El teléfono no puede superar los 20 caracteres.');
    }

    const emailLimpio = email !== undefined ? (email && String(email).trim().length > 0 ? String(email).trim() : null) : undefined;
    if (emailLimpio && emailLimpio.length > 70) {
      throw new BadRequestError('El email no puede superar los 70 caracteres.');
    }
    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: contacto@empresa.com');
    }

    if (direccion !== undefined && typeof direccion === 'string' && direccion.trim().length > 70) {
      throw new BadRequestError('La dirección no puede superar los 70 caracteres.');
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

    const resProv = await pool.query('SELECT nombre_empresa, cotizacion_dolar FROM Proveedor WHERE id_proveedor = $1;', [id]);
    if (resProv.rowCount === 0) {
      throw new NotFoundError('Ese proveedor no existe.');
    }
    const datosProv = resProv.rows[0];

    // Verificar si tiene pagos o compromisos pendientes asociados para evitar fallo 500 de clave foránea en PostgreSQL
    const checkPagos = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM Pago_Proveedor WHERE id_proveedor = $1)::int AS pagos_count,
         (SELECT COUNT(*) FROM Pago_Proveedor_Pendiente WHERE id_proveedor = $1)::int AS pendientes_count;`,
      [id]
    );
    const pagosCount = checkPagos.rows[0]?.pagos_count || 0;
    const pendientesCount = checkPagos.rows[0]?.pendientes_count || 0;
    if (pagosCount > 0 || pendientesCount > 0) {
      throw new ConflictError(
        `No se puede eliminar el proveedor porque posee ${pagosCount} pago(s) y ${pendientesCount} compromiso(s) pendiente(s) registrado(s) en el sistema.`
      );
    }

    if (datosProv.cotizacion_dolar !== null && datosProv.cotizacion_dolar !== undefined) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const resCotGlobal = await client.query(
          `SELECT valor FROM Configuracion_Sistema WHERE clave = 'cotizacion_dolar' LIMIT 1;`
        );
        const cotGlobal = Number(resCotGlobal.rows[0]?.valor);
        const cotEfectiva = Number.isFinite(cotGlobal) && cotGlobal > 0 ? cotGlobal : 1;

        await client.query(
          `UPDATE Productos
           SET id_proveedor = NULL,
               precio = ROUND(precio_usd * $1::numeric, 2),
               precio_reventa = CASE
                 WHEN precio_reventa_usd IS NOT NULL THEN ROUND(precio_reventa_usd * $1::numeric, 2)
                 ELSE precio_reventa
               END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id_proveedor = $2
             AND activo = true
             AND moneda = 'USD'
             AND precio_usd IS NOT NULL;`,
          [cotEfectiva, id]
        );
        await client.query('DELETE FROM Proveedor WHERE id_proveedor = $1;', [id]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      await pool.query('DELETE FROM Proveedor WHERE id_proveedor = $1;', [id]);
    }

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

  /**
   * Actualiza la cotización manual del dólar propia de un proveedor y recalcula de forma exacta (sin redondeo)
   * todos los productos en USD asignados a ese proveedor.
   * Si se envía null/vacío, vuelve a usar la cotización global del sistema.
   */
  static async actualizarCotizacionProveedor(
    id: number,
    cotizacion: number | string | null | undefined,
    operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }
  ) {
    validarId(id, 'No se encontró ese proveedor.');
    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
    const idOp = Number(idUsuarioOperador);
    if (!idUsuarioOperador || isNaN(idOp) || idOp <= 0) {
      throw new UnauthorizedError('No se pudo identificar al administrador que actualiza la cotización.');
    }

    let cotizacionFinal: number | null = null;
    if (cotizacion !== null && cotizacion !== undefined && cotizacion !== '') {
      const num = Number(cotizacion);
      if (isNaN(num) || !isFinite(num) || num <= 0) {
        throw new BadRequestError('La cotización del dólar debe ser mayor a 0.');
      }
      if (num > 99999999.99) {
        throw new BadRequestError('La cotización del dólar no puede superar $99.999.999,99.');
      }
      cotizacionFinal = Math.round(num * 100) / 100;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resProv = await client.query(
        'SELECT id_proveedor, nombre_empresa, cotizacion_dolar FROM Proveedor WHERE id_proveedor = $1 FOR UPDATE;',
        [id]
      );
      if (resProv.rowCount === 0) {
        throw new NotFoundError('Ese proveedor no existe.');
      }
      const prov = resProv.rows[0];
      const cotAnterior = prov.cotizacion_dolar !== null ? Number(prov.cotizacion_dolar) : null;

      await client.query(
        'UPDATE Proveedor SET cotizacion_dolar = $1 WHERE id_proveedor = $2;',
        [cotizacionFinal, id]
      );

      let cotizacionEfectiva = cotizacionFinal;
      if (cotizacionEfectiva === null) {
        const resGlobal = await client.query(`SELECT valor FROM Configuracion_Sistema WHERE clave = 'cotizacion_dolar' LIMIT 1;`);
        cotizacionEfectiva = Number(resGlobal.rows[0]?.valor) || 1;
      }

      const resRecalculo = await client.query(
        `UPDATE Productos
         SET precio = ROUND(precio_usd * $1::numeric, 2),
             precio_reventa = CASE
               WHEN precio_reventa_usd IS NOT NULL THEN ROUND(precio_reventa_usd * $1::numeric, 2)
               ELSE precio_reventa
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id_proveedor = $2 AND moneda = 'USD' AND precio_usd IS NOT NULL AND activo = true
         RETURNING id_producto;`,
        [cotizacionEfectiva, id]
      );
      const productosActualizados = resRecalculo.rowCount || 0;

      const descAnterior = cotAnterior !== null ? `$${cotAnterior.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'Global';
      const descNueva = cotizacionFinal !== null
        ? `$${cotizacionFinal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
        : `Global ($${cotizacionEfectiva.toLocaleString('es-AR', { minimumFractionDigits: 2 })})`;

      await client.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Proveedores', 'Actualización de Cotización USD', $3);`,
        [
          idOp,
          nombreUsuarioOperador || 'Administrador',
          `Cotización USD de proveedor "${prov.nombre_empresa}" (ID #${id}) actualizada de ${descAnterior} a ${descNueva}. Se recalcularon ${productosActualizados} producto(s) en USD.`
        ]
      );

      await client.query('COMMIT');

      return {
        message: `Cotización de ${prov.nombre_empresa} actualizada exitosamente`,
        id_proveedor: id,
        nombre_empresa: prov.nombre_empresa,
        cotizacion_dolar: cotizacionFinal,
        cotizacion_efectiva: cotizacionEfectiva,
        productos_actualizados: productosActualizados
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
