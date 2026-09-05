import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { ReparacionService } from '../services/reparacion.service.js';

export const obtenerReparaciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { estado, busqueda } = req.query as { estado?: string; busqueda?: string };
    const resultado = await ReparacionService.obtenerReparaciones({ estado, busqueda });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerReparacionPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await ReparacionService.obtenerReparacionPorId(id);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const crearReparacion = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_bicicleta, id_usuario, estado, descripcion, costo_mano_obra } = req.body;
    const nuevaRep = await ReparacionService.crearReparacion({
      id_bicicleta,
      id_usuario: req.usuarioToken?.id || id_usuario,
      estado,
      descripcion,
      costo_mano_obra,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(201).json({
      message: 'Bicicleta ingresada al taller con éxito',
      reparacion: nuevaRep
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarEstadoReparacion = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { estado, descripcion, costo_mano_obra } = req.body;

    const repActualizada = await ReparacionService.actualizarEstadoReparacion(id, {
      estado,
      descripcion,
      costo_mano_obra,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json({
      message: 'Orden de taller actualizada exitosamente',
      reparacion: repActualizada
    });
  } catch (error) {
    next(error);
  }
};