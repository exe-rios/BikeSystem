import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { DetalleReparacionService } from '../services/detalleReparacion.service.js';

export const agregarRepuesto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_reparacion, id_producto, cantidad, precio_unitario } = req.body;
    const resultado = await DetalleReparacionService.agregarRepuesto({
      id_reparacion,
      id_producto,
      cantidad,
      precio_unitario,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(201).json({
      message: 'Repuesto asignado con éxito a la orden',
      ...resultado
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerRepuestosDeReparacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id_reparacion = Number(req.params.id_reparacion);
    const resultado = await DetalleReparacionService.obtenerRepuestosDeReparacion(id_reparacion);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const eliminarRepuesto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await DetalleReparacionService.eliminarRepuesto(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};