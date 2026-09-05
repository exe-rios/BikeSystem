import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { PagoProveedorService } from '../services/pagoProveedor.service.js';

export const obtenerMetodosPago = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const metodos = await PagoProveedorService.obtenerMetodosPago();
    res.status(200).json(metodos);
  } catch (error) {
    next(error);
  }
};

export const obtenerPagos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda } = req.query as { busqueda?: string };
    const resultado = await PagoProveedorService.obtenerPagos(busqueda);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const crearPago = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_proveedor, nombre_proveedor, id_metodo_pago, monto_total, observaciones } = req.body;
    const nuevoPago = await PagoProveedorService.crearPago({
      id_proveedor,
      nombre_proveedor,
      id_metodo_pago,
      monto_total,
      observaciones,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      pago: nuevoPago
    });
  } catch (error) {
    next(error);
  }
};
