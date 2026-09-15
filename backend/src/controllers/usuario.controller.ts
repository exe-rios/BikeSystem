import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { UsuarioService } from '../services/usuario.service.js';
import { validarId } from '../utils/validation.js';
import { responderOk, responderCreado } from '../utils/response.js';

/** Endpoint GET /api/usuarios: Consulta lista de usuarios con filtros por rol o búsqueda. */
export const obtenerUsuarios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda, rol } = req.query as { busqueda?: string; rol?: string };
    const resultado = await UsuarioService.obtenerUsuarios({ busqueda, rol });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/usuarios/:id: Consulta los datos individuales de una cuenta de usuario. */
export const obtenerUsuarioPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese usuario.');
    const usuario = await UsuarioService.obtenerUsuarioPorId(id);
    responderOk(res, usuario);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/usuarios: Crea un nuevo usuario en el sistema (requiere rol administrador). */
export const crearUsuario = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre_usuario, contrasena, rol } = req.body;
    const nuevoUsuario = await UsuarioService.crearUsuario({
      nombre_usuario,
      contrasena,
      rol,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario,
      rolOperador: req.usuarioToken?.rol
    });

    responderCreado(res, 'Usuario creado exitosamente', { usuario: nuevoUsuario });
  } catch (error) {
    next(error);
  }
};

/** Endpoint PUT /api/usuarios/:id: Modifica nombre, rol o clave de un usuario. */
export const actualizarUsuario = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese usuario.');
    const { nombre_usuario, contrasena, rol } = req.body;

    const usuarioActualizado = await UsuarioService.actualizarUsuario(id, {
      nombre_usuario,
      contrasena,
      rol,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario,
      rolOperador: req.usuarioToken?.rol
    });

    responderOk(res, {
      message: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado
    });
  } catch (error) {
    next(error);
  }
};

/** Endpoint DELETE /api/usuarios/:id: Elimina una cuenta si no posee registros históricos. */
export const eliminarUsuario = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese usuario.');
    const resultado = await UsuarioService.eliminarUsuario(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario,
      rolOperador: req.usuarioToken?.rol
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};
