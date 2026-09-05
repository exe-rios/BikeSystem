import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { UnauthorizedError, BadRequestError } from '../utils/errors.js';

export interface LoginResult {
  message: string;
  token: string;
  usuario: {
    id: number;
    nombre: string;
    rol: string;
  };
}

export class AuthService {
  static async login(nombreUsuario: string, contrasena: string): Promise<LoginResult> {
    if (!nombreUsuario?.trim() || !contrasena) {
      throw new BadRequestError('Completá el usuario y la contraseña.');
    }

    const query = `
      SELECT id_usuario, nombre_usuario, contrasena, rol 
      FROM Usuario 
      WHERE LOWER(nombre_usuario) = LOWER($1);
    `;
    const result = await pool.query(query, [nombreUsuario.trim()]);
    const usuario = result.rows[0];

    if (!usuario) {
      throw new UnauthorizedError('Ese usuario no existe.');
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      throw new UnauthorizedError('Contraseña incorrecta.');
    }

    const secreto = process.env.JWT_SECRET;
    if (!secreto) {
      throw new Error('[FATAL] JWT_SECRET no está configurado. El servidor no puede firmar tokens.');
    }
    const token = jwt.sign(
      { id: usuario.id_usuario, rol: usuario.rol, nombre_usuario: usuario.nombre_usuario },
      secreto,
      { expiresIn: '8h' }
    );

    // Registrar en Bitacora_Actividad
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Usuarios', 'Inicio de Sesión', $3);`,
        [
          usuario.id_usuario,
          usuario.nombre_usuario,
          `El usuario "${usuario.nombre_usuario}" ha iniciado sesión en el sistema.`
        ]
      );
    } catch {
      // Ignorar error de bitácora
    }

    return {
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre_usuario,
        rol: usuario.rol
      }
    };
  }

  static async testDatabase(): Promise<{ status: string; connected: boolean; time: string; version: string }> {
    const result = await pool.query('SELECT NOW() as hora, version() as version;');
    return {
      status: 'ok',
      connected: true,
      time: result.rows[0].hora,
      version: result.rows[0].version
    };
  }
}
