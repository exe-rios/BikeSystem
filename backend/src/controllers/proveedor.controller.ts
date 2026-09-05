import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { ProveedorService } from '../services/proveedor.service.js';

export const obtenerProveedores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda } = req.query as { busqueda?: string };
    const resultado = await ProveedorService.obtenerProveedores(busqueda);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerProveedorPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const proveedor = await ProveedorService.obtenerProveedorPorId(id);
    res.status(200).json(proveedor);
  } catch (error) {
    next(error);
  }
};

export const crearProveedor = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre_empresa, cuit, telefono, email, direccion } = req.body;
    const nuevoProveedor = await ProveedorService.crearProveedor({
      nombre_empresa,
      cuit,
      telefono,
      email,
      direccion,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(201).json({
      message: 'Proveedor creado exitosamente',
      proveedor: nuevoProveedor
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarProveedor = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { nombre_empresa, cuit, telefono, email, direccion } = req.body;

    const provActualizado = await ProveedorService.actualizarProveedor(id, {
      nombre_empresa,
      cuit,
      telefono,
      email,
      direccion,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json({
      message: 'Proveedor actualizado exitosamente',
      proveedor: provActualizado
    });
  } catch (error) {
    next(error);
  }
};

export const eliminarProveedor = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await ProveedorService.eliminarProveedor(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};