import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';
import { EMAIL_REGEX, DNI_REGEX, validarId } from '../utils/validation.js';
import { normalizarPaginacion, aplicarPaginacionSQL, calcularMetaPaginacion } from '../utils/pagination.js';

/** Servicio para la administración y validación de clientes del sistema. */
export class ClienteService {
  /** Obtiene clientes paginados con soporte para búsqueda libre por nombre, DNI o datos de contacto. */
  static async obtenerClientes(filtros?: string | { 
    busqueda?: string | undefined;
    limite?: number | string | undefined;
    pagina?: number | string | undefined;
  }) {
    let busqueda: string | undefined;
    let limite: number | string | undefined;
    let pagina: number | string | undefined;

    if (typeof filtros === 'string') {
      busqueda = filtros;
    } else if (filtros) {
      busqueda = filtros.busqueda;
      limite = filtros.limite;
      pagina = filtros.pagina;
    }

    let query = `
      SELECT id_cliente, nombre, apellido, dni, telefono, email, direccion, created_at, updated_at,
             COUNT(*) OVER()::INT AS total_registros
      FROM Cliente
    `;

    const params: any[] = [];
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` WHERE (
        nombre ILIKE $1 OR 
        apellido ILIKE $1 OR 
        dni ILIKE $1 OR 
        telefono ILIKE $1 OR 
        email ILIKE $1 OR 
        CAST(id_cliente AS TEXT) ILIKE $1
      )`;
      params.push(term);
    }

    query += ` ORDER BY id_cliente DESC`;

    const paginacion = normalizarPaginacion({ limite, pagina }, { opcional: true });
    query = aplicarPaginacionSQL(query, params, paginacion);

    const result = await pool.query(query, params);
    const total = result.rows.length > 0 ? Number(result.rows[0].total_registros) : 0;
    const meta = calcularMetaPaginacion(total, paginacion);
    const clientes = result.rows.map(({ total_registros, ...c }) => c);

    return {
      ...meta,
      clientes
    };
  }

  /** Obtiene un cliente por su ID único. */
  static async obtenerClientePorId(id: number) {
    validarId(id, 'No se encontró ese cliente.');

    const query = `
      SELECT id_cliente, nombre, apellido, dni, telefono, email, direccion, created_at, updated_at
      FROM Cliente
      WHERE id_cliente = $1;
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Ese cliente no existe.');
    }

    return result.rows[0];
  }

  /** Registra un nuevo cliente validando unicidad de DNI y formato de email. */
  static async crearCliente(datos: {
    nombre: string;
    apellido: string;
    dni: string;
    telefono?: string | undefined;
    email?: string | undefined;
    direccion?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const { nombre, apellido, dni, telefono, email, direccion, idUsuarioOperador, nombreUsuarioOperador } = datos;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      throw new BadRequestError('Escribí el nombre del cliente (al menos 2 letras).');
    }

    if (!apellido || typeof apellido !== 'string' || apellido.trim().length < 2) {
      throw new BadRequestError('Escribí el apellido del cliente (al menos 2 letras).');
    }

    if (!dni || typeof dni !== 'string' || !DNI_REGEX.test(dni.trim())) {
      throw new BadRequestError('El DNI debe tener entre 7 y 10 números, sin puntos ni espacios.');
    }

    const dniLimpio = dni.trim();
    const emailLimpio = email ? String(email).trim() : null;

    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: nombre@correo.com');
    }

    // Verificar si ya existe un cliente con ese DNI
    const checkDni = await pool.query('SELECT id_cliente, nombre, apellido FROM Cliente WHERE dni = $1;', [dniLimpio]);
    if ((checkDni.rowCount || 0) > 0) {
      throw new ConflictError(`Ese DNI ya está registrado a nombre de ${checkDni.rows[0].nombre} ${checkDni.rows[0].apellido}.`);
    }

    const query = `
      INSERT INTO Cliente (nombre, apellido, dni, telefono, email, direccion)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      nombre.trim(),
      apellido.trim(),
      dniLimpio,
      telefono ? String(telefono).trim() : null,
      emailLimpio,
      direccion ? String(direccion).trim() : null
    ];

    const result = await pool.query(query, values);
    const nuevoCliente = result.rows[0];

    // Registrar en Bitacora_Actividad
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Clientes', 'Alta de Cliente', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Cliente registrado: "${nuevoCliente.nombre} ${nuevoCliente.apellido}" (DNI: ${nuevoCliente.dni}, ID #${nuevoCliente.id_cliente}).`
        ]
      );
    } catch {
      // Ignorar error de bitácora
    }

    return nuevoCliente;
  }

  /** Actualiza la información personal y de contacto del cliente. */
  static async actualizarCliente(id: number, datos: {
    nombre?: string | undefined;
    apellido?: string | undefined;
    dni?: string | undefined;
    telefono?: string | undefined;
    email?: string | undefined;
    direccion?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    validarId(id, 'No se encontró ese cliente.');

    const { nombre, apellido, dni, telefono, email, direccion, idUsuarioOperador, nombreUsuarioOperador } = datos;

    const checkCliente = await pool.query('SELECT id_cliente, nombre, apellido, dni FROM Cliente WHERE id_cliente = $1;', [id]);
    if (checkCliente.rowCount === 0) {
      throw new NotFoundError('Ese cliente no existe.');
    }

    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length < 2)) {
      throw new BadRequestError('El nombre debe tener al menos 2 letras.');
    }

    if (apellido !== undefined && (typeof apellido !== 'string' || apellido.trim().length < 2)) {
      throw new BadRequestError('El apellido debe tener al menos 2 letras.');
    }

    if (dni !== undefined && (typeof dni !== 'string' || !DNI_REGEX.test(dni.trim()))) {
      throw new BadRequestError('El DNI debe tener entre 7 y 10 números.');
    }

    const emailLimpio = email ? String(email).trim() : null;
    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: nombre@correo.com');
    }

    // Verificar si el nuevo DNI ya le pertenece a otro cliente
    if (dni) {
      const checkDni = await pool.query('SELECT id_cliente FROM Cliente WHERE dni = $1 AND id_cliente != $2;', [dni.trim(), id]);
      if ((checkDni.rowCount || 0) > 0) {
        throw new ConflictError(`Ese DNI ya está registrado a nombre de otro cliente.`);
      }
    }

    const query = `
      UPDATE Cliente
      SET nombre = COALESCE($1, nombre),
          apellido = COALESCE($2, apellido),
          dni = COALESCE($3, dni),
          telefono = COALESCE($4, telefono),
          email = COALESCE($5, email),
          direccion = COALESCE($6, direccion),
          updated_at = CURRENT_TIMESTAMP
      WHERE id_cliente = $7
      RETURNING *;
    `;
    const values = [
      nombre ? nombre.trim() : null,
      apellido ? apellido.trim() : null,
      dni ? dni.trim() : null,
      telefono !== undefined ? (telefono ? String(telefono).trim() : null) : null,
      email !== undefined ? emailLimpio : null,
      direccion !== undefined ? (direccion ? String(direccion).trim() : null) : null,
      id
    ];

    const result = await pool.query(query, values);
    const clienteActualizado = result.rows[0];

    // Registrar en Bitacora_Actividad
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Clientes', 'Modificación de Cliente', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Cliente actualizado: "${clienteActualizado.nombre} ${clienteActualizado.apellido}" (ID #${id}).`
        ]
      );
    } catch {
      // Ignorar error de bitácora
    }

    return clienteActualizado;
  }

  /** Elimina un cliente si no registra compras ni bicicletas vinculadas. */
  static async eliminarCliente(id: number, operador: {
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    validarId(id, 'No se encontró ese cliente.');

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;

    const resCli = await pool.query('SELECT nombre, apellido, dni FROM Cliente WHERE id_cliente = $1;', [id]);
    if (resCli.rowCount === 0) {
      throw new NotFoundError('Ese cliente no existe.');
    }
    const datosCliente = resCli.rows[0];

    // Verificar si posee historial para evitar fallo de FK en PostgreSQL
    const checkHistorial = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM Bicicleta WHERE id_cliente = $1)::int AS bicis_count,
        (SELECT COUNT(*) FROM Venta WHERE id_cliente = $1)::int AS ventas_count;
    `, [id]);

    const { bicis_count, ventas_count } = checkHistorial.rows[0];
    if (bicis_count > 0 || ventas_count > 0) {
      throw new ConflictError(`No se puede eliminar el cliente porque posee historial asociado (${bicis_count} bicicleta(s) y ${ventas_count} venta(s)).`);
    }

    await pool.query('DELETE FROM Cliente WHERE id_cliente = $1;', [id]);

    // Registrar en Bitacora_Actividad
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Clientes', 'Baja de Cliente', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Cliente eliminado: "${datosCliente.nombre} ${datosCliente.apellido}" (DNI: ${datosCliente.dni}, ID #${id}).`
        ]
      );
    } catch {
      // Ignorar error de bitácora
    }

    return { message: 'Cliente eliminado correctamente' };
  }
}
