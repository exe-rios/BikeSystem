import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { UsuarioService } from '../services/usuario.service.js';

export const obtenerUsuarios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda, rol } = req.query as { busqueda?: string; rol?: string };
    const resultado = await UsuarioService.obtenerUsuarios({ busqueda, rol });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerUsuarioPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const usuario = await UsuarioService.obtenerUsuarioPorId(id);
    res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

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

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: nuevoUsuario
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarUsuario = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { nombre_usuario, contrasena, rol } = req.body;

    const usuarioActualizado = await UsuarioService.actualizarUsuario(id, {
      nombre_usuario,
      contrasena,
      rol,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario,
      rolOperador: req.usuarioToken?.rol
    });

    res.status(200).json({
      message: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado
    });
  } catch (error) {
    next(error);
  }
};

export const eliminarUsuario = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await UsuarioService.eliminarUsuario(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario,
      rolOperador: req.usuarioToken?.rol
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};
