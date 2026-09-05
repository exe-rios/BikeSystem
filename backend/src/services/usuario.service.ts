import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';

const ROLES_VALIDOS = ['ADMIN', 'EMPLEADO', 'SUPERADMIN'];

export class UsuarioService {
  static async obtenerUsuarios(filtros: { busqueda?: string | undefined; rol?: string | undefined }) {
    const { busqueda, rol } = filtros;
    let query = `
      SELECT id_usuario, nombre_usuario, rol
      FROM Usuario
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (rol && typeof rol === 'string' && rol.trim() !== 'todos') {
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

  static async obtenerUsuarioPorId(id: number) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese usuario.');
    }

    const query = `
      SELECT id_usuario, nombre_usuario, rol
      FROM Usuario
      WHERE id_usuario = $1;
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Ese usuario no existe.');
    }

    return result.rows[0];
  }

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

    if (!contrasena || typeof contrasena !== 'string' || contrasena.length < 6) {
      throw new BadRequestError('La contraseña debe tener al menos 6 caracteres.');
    }

    const rolNormalizado = String(rol || 'EMPLEADO').trim().toUpperCase();
    if (!ROLES_VALIDOS.includes(rolNormalizado)) {
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

  static async actualizarUsuario(id: number, datos: {
    nombre_usuario?: string | undefined;
    contrasena?: string | undefined;
    rol?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
    rolOperador?: string | undefined;
  }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese usuario.');
    }

    const { nombre_usuario, contrasena, rol, idUsuarioOperador, nombreUsuarioOperador, rolOperador } = datos;

    if (rolOperador !== 'ADMIN' && rolOperador !== 'SUPERADMIN') {
      throw new ForbiddenError('Solo un administrador puede modificar usuarios.');
    }

    // Verificar existencia previa
    const checkPrevio = await pool.query('SELECT id_usuario, nombre_usuario, rol FROM Usuario WHERE id_usuario = $1;', [id]);
    if (checkPrevio.rowCount === 0) {
      throw new NotFoundError('Ese usuario no existe.');
    }

    // Si modifica el nombre_usuario, validar unicidad
    if (nombre_usuario && typeof nombre_usuario === 'string') {
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

    if (idUsuarioOperador && idUsuarioOperador === id) {
      throw new BadRequestError('No podés eliminar tu propia cuenta mientras estás en sesión.');
    }

    const resUser = await pool.query('SELECT nombre_usuario, rol FROM Usuario WHERE id_usuario = $1;', [id]);
    if (resUser.rowCount === 0) {
      throw new NotFoundError('Ese usuario no existe.');
    }
    const usuarioAEliminar = resUser.rows[0];

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
