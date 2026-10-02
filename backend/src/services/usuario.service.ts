import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { validarId } from '../utils/validation.js';

const ROLES_VALIDOS = ['ADMIN', 'EMPLEADO', 'SUPERADMIN'];
const ROLES_CREABLES = ['ADMIN', 'EMPLEADO'];

/** Servicio para la administración de cuentas de usuario, roles y credenciales. */
export class UsuarioService {
  /** Lista usuarios registrados con filtros opcionales por rol o coincidencia de nombre. */
  static async obtenerUsuarios(filtros: {
    busqueda?: string | undefined;
    rol?: string | undefined;
    rolOperador?: string | undefined;
  }) {
    const { busqueda, rol, rolOperador } = filtros;
    let query = `
      SELECT id_usuario, nombre_usuario, rol
      FROM Usuario
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    // El perfil superadmin está completamente oculto para empleados y administradores
    if (rolOperador !== 'SUPERADMIN') {
      whereClauses.push(`(rol != 'SUPERADMIN' AND LOWER(nombre_usuario) != 'superadmin')`);
    }

    if (rol && typeof rol === 'string' && rol.trim() && rol.trim() !== 'TODOS') {
      whereClauses.push(`rol = $${paramIdx}`);
      params.push(rol.trim().toUpperCase());
      paramIdx++;
    }

    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      whereClauses.push(`(
        nombre_usuario ILIKE $${paramIdx} OR 
        rol ILIKE $${paramIdx} OR 
        CAST(id_usuario AS TEXT) ILIKE $${paramIdx}
      )`);
      params.push(term);
      paramIdx++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY id_usuario ASC;`;

    const result = await pool.query(query, params);
    return {
      total: result.rowCount || 0,
      usuarios: result.rows
    };
  }

  /** Obtiene un usuario específico por su ID. */
  static async obtenerUsuarioPorId(id: number, rolOperador?: string | undefined) {
    validarId(id, 'No se encontró ese usuario.');

    const query = `
      SELECT id_usuario, nombre_usuario, rol
      FROM Usuario
      WHERE id_usuario = $1;
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Ese usuario no existe.');
    }

    const usuario = result.rows[0];

    // Ocultar al superadmin si quien consulta no es superadmin
    if (rolOperador !== 'SUPERADMIN' && (usuario.rol === 'SUPERADMIN' || usuario.nombre_usuario?.toLowerCase() === 'superadmin')) {
      throw new NotFoundError('Ese usuario no existe.');
    }

    return usuario;
  }

  /** Crea una nueva cuenta de usuario con contraseña hasheada y asignación de rol. */
  static async crearUsuario(datos: {
    nombre_usuario: string;
    contrasena: string;
    rol: string;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
    rolOperador?: string | undefined;
  }) {
    const { nombre_usuario, contrasena, rol, idUsuarioOperador, nombreUsuarioOperador, rolOperador } = datos;

    if (rolOperador !== 'ADMIN' && rolOperador !== 'SUPERADMIN') {
      throw new ForbiddenError('Solo un administrador puede crear usuarios.');
    }

    if (!nombre_usuario || typeof nombre_usuario !== 'string' || nombre_usuario.trim().length < 3) {
      throw new BadRequestError('El nombre de usuario debe tener al menos 3 letras.');
    }

    if (nombre_usuario.trim().toLowerCase() === 'superadmin') {
      throw new BadRequestError('El nombre de usuario "superadmin" está reservado para el sistema.');
    }

    if (!contrasena || typeof contrasena !== 'string' || contrasena.length < 6) {
      throw new BadRequestError('La contraseña debe tener al menos 6 caracteres.');
    }

    const rolNormalizado = String(rol || 'EMPLEADO').trim().toUpperCase();
    if (rolNormalizado === 'SUPERADMIN') {
      throw new BadRequestError('No se puede crear usuarios con el rol SUPERADMIN. El sistema posee un único perfil superadministrador.');
    }

    if (!ROLES_CREABLES.includes(rolNormalizado)) {
      throw new BadRequestError('Elegí un rol válido: Administrador o Empleado.');
    }

    // Verificar si ya existe el nombre de usuario
    const checkUser = await pool.query(
      'SELECT id_usuario FROM Usuario WHERE LOWER(nombre_usuario) = LOWER($1);',
      [nombre_usuario.trim()]
    );
    if ((checkUser.rowCount || 0) > 0) {
      throw new ConflictError(`Ya existe un usuario con ese nombre.`);
    }

    const saltRounds = 10;
    const contrasenaHash = await bcrypt.hash(contrasena, saltRounds);

    const queryInsert = `
      INSERT INTO Usuario (nombre_usuario, contrasena, rol)
      VALUES ($1, $2, $3)
      RETURNING id_usuario, nombre_usuario, rol;
    `;
    const result = await pool.query(queryInsert, [
      nombre_usuario.trim(),
      contrasenaHash,
      rolNormalizado
    ]);

    const nuevoUsuario = result.rows[0];

    // Registrar en Bitácora
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Usuarios', 'Alta de Usuario', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Admin',
          `Usuario "${nuevoUsuario.nombre_usuario}" creado con rol "${nuevoUsuario.rol}" (ID #${nuevoUsuario.id_usuario}).`
        ]
      );
    } catch {
      // Ignorar
    }

    return nuevoUsuario;
  }

  /** Modifica nombre de usuario, contraseña o rol de un usuario existente. */
  static async actualizarUsuario(id: number, datos: {
    nombre_usuario?: string | undefined;
    contrasena?: string | undefined;
    rol?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
    rolOperador?: string | undefined;
  }) {
    validarId(id, 'No se encontró ese usuario.');

    const { nombre_usuario, contrasena, rol, idUsuarioOperador, nombreUsuarioOperador, rolOperador } = datos;

    if (rolOperador !== 'ADMIN' && rolOperador !== 'SUPERADMIN') {
      throw new ForbiddenError('Solo un administrador puede modificar usuarios.');
    }

    // Verificar existencia previa
    const checkPrevio = await pool.query('SELECT id_usuario, nombre_usuario, rol FROM Usuario WHERE id_usuario = $1;', [id]);
    if (checkPrevio.rowCount === 0) {
      throw new NotFoundError('Ese usuario no existe.');
    }
    const usuarioActual = checkPrevio.rows[0];

    // Ocultar al superadmin si quien opera no es superadmin
    if (rolOperador !== 'SUPERADMIN' && (usuarioActual.rol === 'SUPERADMIN' || usuarioActual.nombre_usuario?.toLowerCase() === 'superadmin')) {
      throw new NotFoundError('Ese usuario no existe.');
    }

    // Prohibido asignar el rol SUPERADMIN a otros usuarios
    if (rol && String(rol).trim().toUpperCase() === 'SUPERADMIN' && usuarioActual.rol !== 'SUPERADMIN') {
      throw new BadRequestError('No se puede asignar el rol SUPERADMIN a otros usuarios.');
    }

    // Prohibido degradar o cambiar rol del superadmin
    if (usuarioActual.rol === 'SUPERADMIN' && rol && String(rol).trim().toUpperCase() !== 'SUPERADMIN') {
      throw new BadRequestError('No se puede modificar el rol del superadministrador.');
    }

    // Si modifica el nombre_usuario, validar unicidad y nombres reservados
    if (nombre_usuario && typeof nombre_usuario === 'string') {
      if (nombre_usuario.trim().toLowerCase() === 'superadmin' && usuarioActual.nombre_usuario.toLowerCase() !== 'superadmin') {
        throw new BadRequestError('El nombre de usuario "superadmin" está reservado para el sistema.');
      }
      if (usuarioActual.nombre_usuario.toLowerCase() === 'superadmin' && nombre_usuario.trim().toLowerCase() !== 'superadmin') {
        throw new BadRequestError('No se puede cambiar el nombre de usuario del superadministrador.');
      }

      const checkNombre = await pool.query(
        'SELECT id_usuario FROM Usuario WHERE LOWER(nombre_usuario) = LOWER($1) AND id_usuario != $2;',
        [nombre_usuario.trim(), id]
      );
      if ((checkNombre.rowCount || 0) > 0) {
        throw new ConflictError(`Ese nombre de usuario ya lo usa otra persona.`);
      }
    }

    let contrasenaHash: string | null = null;
    if (contrasena && typeof contrasena === 'string' && contrasena.trim()) {
      if (contrasena.length < 6) {
        throw new BadRequestError('La contraseña nueva debe tener al menos 6 caracteres.');
      }
      contrasenaHash = await bcrypt.hash(contrasena, 10);
    }

    let rolFinal: string | null = null;
    if (rol) {
      rolFinal = String(rol).trim().toUpperCase();
      if (!ROLES_VALIDOS.includes(rolFinal)) {
        throw new BadRequestError('Elegí un rol válido: Administrador o Empleado.');
      }

      // Proteger contra auto-degradación o eliminación del último administrador
      if (rolFinal !== 'ADMIN' && rolFinal !== 'SUPERADMIN') {
        if (idUsuarioOperador && idUsuarioOperador === id) {
          throw new BadRequestError('No podés quitarte tus propios privilegios de administrador.');
        }

        const checkAdmins = await pool.query(
          "SELECT COUNT(*)::int AS admin_count FROM Usuario WHERE rol IN ('ADMIN', 'SUPERADMIN') AND id_usuario != $1;",
          [id]
        );
        const adminCount = checkAdmins.rows[0]?.admin_count || 0;
        if (adminCount <= 0) {
          throw new BadRequestError('No se puede degradar al único administrador del sistema.');
        }
      }
    }

    const queryUpdate = `
      UPDATE Usuario
      SET nombre_usuario = COALESCE($1, nombre_usuario),
          contrasena = COALESCE($2, contrasena),
          rol = COALESCE($3, rol)
      WHERE id_usuario = $4
      RETURNING id_usuario, nombre_usuario, rol;
    `;
    const resultUpdate = await pool.query(queryUpdate, [
      nombre_usuario ? nombre_usuario.trim() : null,
      contrasenaHash,
      rolFinal,
      id
    ]);

    const usuarioActualizado = resultUpdate.rows[0];

    // Registrar en Bitácora
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Usuarios', 'Modificación de Usuario', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Admin',
          `Usuario "${usuarioActualizado.nombre_usuario}" (ID #${id}) actualizado. Rol: ${usuarioActualizado.rol}.`
        ]
      );
    } catch {
      // Ignorar
    }

    return usuarioActualizado;
  }

  /** Elimina un usuario si no posee historial de operaciones registrado en el sistema. */
  static async eliminarUsuario(id: number, operador: {
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
    rolOperador?: string | undefined;
  }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese usuario.');
    }

    const { idUsuarioOperador, nombreUsuarioOperador, rolOperador } = operador;

    if (rolOperador !== 'ADMIN' && rolOperador !== 'SUPERADMIN') {
      throw new ForbiddenError('Solo un administrador puede eliminar usuarios.');
    }

    const resUser = await pool.query('SELECT nombre_usuario, rol FROM Usuario WHERE id_usuario = $1;', [id]);
    if (resUser.rowCount === 0) {
      throw new NotFoundError('Ese usuario no existe.');
    }
    const usuarioAEliminar = resUser.rows[0];

    // Ocultar al superadmin si quien opera no es superadmin
    if (rolOperador !== 'SUPERADMIN' && (usuarioAEliminar.rol === 'SUPERADMIN' || usuarioAEliminar.nombre_usuario?.toLowerCase() === 'superadmin')) {
      throw new NotFoundError('Ese usuario no existe.');
    }

    // Prohibido eliminar la cuenta de superadmin
    if (usuarioAEliminar.rol === 'SUPERADMIN' || usuarioAEliminar.nombre_usuario?.toLowerCase() === 'superadmin') {
      throw new ForbiddenError('La cuenta de superadministrador está reservada para mantenimiento y no puede ser eliminada.');
    }

    if (idUsuarioOperador && idUsuarioOperador === id) {
      throw new BadRequestError('No podés eliminar tu propia cuenta mientras estás en sesión.');
    }

    // Verificar que no sea el último administrador del sistema
    if (usuarioAEliminar.rol === 'ADMIN') {
      const checkAdmins = await pool.query(
        "SELECT COUNT(*)::int AS admin_count FROM Usuario WHERE rol IN ('ADMIN', 'SUPERADMIN') AND id_usuario != $1;",
        [id]
      );
      const adminCount = checkAdmins.rows[0]?.admin_count || 0;
      if (adminCount <= 0) {
        throw new BadRequestError('No se puede eliminar al único administrador del sistema.');
      }
    }

    // Verificar si posee historial operativo en el sistema para evitar fallo de FK en PostgreSQL
    const checkHistorial = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM Venta WHERE id_usuario = $1)::int +
        (SELECT COUNT(*) FROM Reparacion WHERE id_usuario = $1)::int +
        (SELECT COUNT(*) FROM Pago_Proveedor WHERE id_usuario = $1)::int +
        (SELECT COUNT(*) FROM Movimiento_Stock WHERE id_usuario = $1)::int AS total_movimientos;
    `, [id]);

    const totalMovimientos = Number(checkHistorial.rows[0]?.total_movimientos || 0);
    if (totalMovimientos > 0) {
      throw new ConflictError(`No se puede eliminar el usuario porque posee ${totalMovimientos} registro(s) históricos (ventas, reparaciones, pagos o movimientos de inventario).`);
    }

    await pool.query('DELETE FROM Usuario WHERE id_usuario = $1;', [id]);

    // Registrar en Bitácora
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Usuarios', 'Baja de Usuario', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Admin',
          `Usuario "${usuarioAEliminar.nombre_usuario}" (ID #${id}, Rol: ${usuarioAEliminar.rol}) fue eliminado del sistema.`
        ]
      );
    } catch {
      // Ignorar
    }

    return { message: 'Usuario eliminado exitosamente' };
  }
}
