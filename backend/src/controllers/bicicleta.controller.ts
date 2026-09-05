import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { BicicletaService } from '../services/bicicleta.service.js';

export const obtenerBicicletas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_cliente, busqueda } = req.query as { id_cliente?: string; busqueda?: string };
    const resultado = await BicicletaService.obtenerBicicletas({ id_cliente, busqueda });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerBicicletaPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const bicicleta = await BicicletaService.obtenerBicicletaPorId(id);
    res.status(200).json(bicicleta);
  } catch (error) {
    next(error);
  }
};

export const crearBicicleta = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_cliente, marca, modelo } = req.body;
    const nuevaBici = await BicicletaService.crearBicicleta({
      id_cliente,
      marca,
      modelo,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(201).json({
      message: 'Bicicleta registrada con éxito',
      bicicleta: nuevaBici
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarBicicleta = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { marca, modelo } = req.body;

    const biciActualizada = await BicicletaService.actualizarBicicleta(id, {
      marca,
      modelo,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json({
      message: 'Bicicleta actualizada con éxito',
      bicicleta: biciActualizada
    });
  } catch (error) {
    next(error);
  }
};

export const eliminarBicicleta = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await BicicletaService.eliminarBicicleta(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerHistorialBicicleta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await BicicletaService.obtenerHistorialBicicleta(id);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};