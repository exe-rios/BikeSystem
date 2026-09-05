import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { ClienteService } from '../services/cliente.service.js';

export const obtenerClientes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda } = req.query as { busqueda?: string };
    const resultado = await ClienteService.obtenerClientes(busqueda);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerClientePorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const cliente = await ClienteService.obtenerClientePorId(id);
    res.status(200).json(cliente);
  } catch (error) {
    next(error);
  }
};

export const crearCliente = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;
    const nuevoCliente = await ClienteService.crearCliente({
      nombre,
      apellido,
      dni,
      telefono,
      email,
      direccion,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(201).json({
      message: 'Cliente creado con éxito',
      cliente: nuevoCliente
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarCliente = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;

    const clienteActualizado = await ClienteService.actualizarCliente(id, {
      nombre,
      apellido,
      dni,
      telefono,
      email,
      direccion,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json({
      message: 'Cliente actualizado con éxito',
      cliente: clienteActualizado
    });
  } catch (error) {
    next(error);
  }
};

export const eliminarCliente = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await ClienteService.eliminarCliente(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};