import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';
import { EMAIL_REGEX, DNI_REGEX, validarId } from '../utils/validation.js';
import { normalizarPaginacion, aplicarPaginacionSQL, calcularMetaPaginacion } from '../utils/pagination.js';

const esConsumidorFinal = (c: { nombre?: string | null; apellido?: string | null; dni?: string | null }): boolean => {
  const nom = (c.nombre || '').trim().toLowerCase();
  const ape = (c.apellido || '').trim().toLowerCase();
  return (
    c.dni?.trim() === '00000000' ||
    (nom === 'consumidor' && ape === 'final') ||
    (nom === 'final' && ape === 'consumidor')
  );
};

const validarTelefonoOpcional = (telefono: unknown): string | null => {
  if (telefono === undefined || telefono === null) return null;
  const telLimpio = String(telefono).trim();
  if (!telLimpio) return null;
  if (telLimpio.length > 20) {
    throw new BadRequestError('El teléfono no puede superar los 20 caracteres.');
  }
  const digitos = telLimpio.replace(/\D/g, '');
  if (!/^[+\d\s()-]+$/.test(telLimpio) || digitos.length < 7) {
    throw new BadRequestError('El teléfono debe tener entre 7 y 20 caracteres válidos (números, espacios, +, - o paréntesis).');
  }
  return telLimpio;
};

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
        (nombre || ' ' || apellido) ILIKE $1 OR 
        (apellido || ' ' || nombre) ILIKE $1 OR 
        dni ILIKE $1 OR 
        telefono ILIKE $1 OR 
        email ILIKE $1 OR 
        CAST(id_cliente AS TEXT) ILIKE $1
      )`;
      params.push(term);
    }

    query += ` ORDER BY 
      CASE 
        WHEN (LOWER(TRIM(nombre)) = 'consumidor' AND LOWER(TRIM(apellido)) = 'final')
          OR (LOWER(TRIM(nombre)) = 'final' AND LOWER(TRIM(apellido)) = 'consumidor') THEN 0 
        ELSE 1 
      END,
      id_cliente DESC`;

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
    if (nombre.trim().length > 50) {
      throw new BadRequestError('El nombre no puede superar los 50 caracteres.');
    }

    if (!apellido || typeof apellido !== 'string' || apellido.trim().length < 2) {
      throw new BadRequestError('Escribí el apellido del cliente (al menos 2 letras).');
    }
    if (apellido.trim().length > 50) {
      throw new BadRequestError('El apellido no puede superar los 50 caracteres.');
    }

    if (!dni || typeof dni !== 'string' || !DNI_REGEX.test(dni.trim())) {
      throw new BadRequestError('El DNI debe tener entre 7 y 10 números, sin puntos ni espacios.');
    }

    const dniLimpio = dni.trim();
    if (dniLimpio.length > 10) {
      throw new BadRequestError('El DNI no puede superar los 10 caracteres.');
    }

    const telefonoLimpio = validarTelefonoOpcional(telefono);

    const emailLimpio = email ? String(email).trim() : null;
    if (emailLimpio && emailLimpio.length > 100) {
      throw new BadRequestError('El email no puede superar los 100 caracteres.');
    }
    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: nombre@correo.com');
    }

    const direccionLimpia = direccion && String(direccion).trim() ? String(direccion).trim() : null;
    if (direccionLimpia && direccionLimpia.length > 150) {
      throw new BadRequestError('La dirección no puede superar los 150 caracteres.');
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
      telefonoLimpio,
      emailLimpio,
      direccionLimpia
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
    const clienteActual = checkCliente.rows[0];

    if (esConsumidorFinal(clienteActual)) {
      const cambiaNombre = nombre !== undefined && String(nombre).trim().toLowerCase() !== String(clienteActual.nombre || '').trim().toLowerCase();
      const cambiaApellido = apellido !== undefined && String(apellido).trim().toLowerCase() !== String(clienteActual.apellido || '').trim().toLowerCase();
      const cambiaDni = dni !== undefined && String(dni).trim() !== String(clienteActual.dni || '').trim();
      if (cambiaNombre || cambiaApellido || cambiaDni) {
        throw new ConflictError('No se puede modificar el nombre, apellido ni DNI de Consumidor Final.');
      }
    }

    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length < 2)) {
      throw new BadRequestError('El nombre debe tener al menos 2 letras.');
    }
    if (nombre !== undefined && typeof nombre === 'string' && nombre.trim().length > 50) {
      throw new BadRequestError('El nombre no puede superar los 50 caracteres.');
    }

    if (apellido !== undefined && (typeof apellido !== 'string' || apellido.trim().length < 2)) {
      throw new BadRequestError('El apellido debe tener al menos 2 letras.');
    }
    if (apellido !== undefined && typeof apellido === 'string' && apellido.trim().length > 50) {
      throw new BadRequestError('El apellido no puede superar los 50 caracteres.');
    }

    if (dni !== undefined && (typeof dni !== 'string' || !DNI_REGEX.test(dni.trim()))) {
      throw new BadRequestError('El DNI debe tener entre 7 y 10 números.');
    }
    if (dni !== undefined && typeof dni === 'string' && dni.trim().length > 10) {
      throw new BadRequestError('El DNI no puede superar los 10 caracteres.');
    }

    const tieneTelefono = 'telefono' in datos;
    const telefonoLimpio = tieneTelefono ? validarTelefonoOpcional(telefono) : null;

    const tieneEmail = 'email' in datos;
    const emailLimpio = tieneEmail && email ? String(email).trim() : null;
    if (emailLimpio && emailLimpio.length > 100) {
      throw new BadRequestError('El email no puede superar los 100 caracteres.');
    }
    if (emailLimpio && !EMAIL_REGEX.test(emailLimpio)) {
      throw new BadRequestError('El email no es válido. Ejemplo: nombre@correo.com');
    }

    const tieneDireccion = 'direccion' in datos;
    const direccionLimpia = tieneDireccion && direccion && String(direccion).trim() ? String(direccion).trim() : null;
    if (direccionLimpia && direccionLimpia.length > 150) {
      throw new BadRequestError('La dirección no puede superar los 150 caracteres.');
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
          telefono = CASE WHEN $4::boolean THEN $5 ELSE telefono END,
          email = CASE WHEN $6::boolean THEN $7 ELSE email END,
          direccion = CASE WHEN $8::boolean THEN $9 ELSE direccion END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id_cliente = $10
      RETURNING *;
    `;
    const values = [
      nombre ? nombre.trim() : null,
      apellido ? apellido.trim() : null,
      dni ? dni.trim() : null,
      tieneTelefono,
      telefonoLimpio,
      tieneEmail,
      emailLimpio,
      tieneDireccion,
      direccionLimpia,
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

    if (esConsumidorFinal(datosCliente)) {
      throw new ConflictError('No se puede eliminar al cliente Consumidor Final del sistema.');
    }

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
