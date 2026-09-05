import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { VentaService } from '../services/venta.service.js';

export const crearVenta = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_cliente, detalles, id_metodo_pago } = req.body;
    const resultado = await VentaService.crearVenta({
      id_cliente,
      id_metodo_pago,
      detalles,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(201).json({
      message: 'Venta registrada con éxito',
      ...resultado
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerVentas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda } = req.query as { busqueda?: string };
    const resultado = await VentaService.obtenerVentas(busqueda);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerVentaPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await VentaService.obtenerVentaPorId(id);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const anularVenta = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const motivo = req.body.motivo || req.body.motivo_anulacion || 'Anulada por administración';

    const resultado = await VentaService.anularVenta(id, motivo, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerMetodosPago = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const metodos = await VentaService.obtenerMetodosPago();
    res.status(200).json(metodos);
  } catch (error) {
    next(error);
  }
};

export const obtenerGarantiasBicicletas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda } = req.query as { busqueda?: string };
    const resultado = await VentaService.obtenerGarantiasBicicletas(busqueda);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const agregarDetalleVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_venta, id_producto, cantidad, precio_unitario } = req.body;
    const resultado = await VentaService.agregarDetalleVenta(Number(id_venta), {
      id_producto,
      cantidad,
      precio_unitario
    });
    res.status(201).json({
      message: 'Artículo agregado a la venta con éxito',
      detalle: resultado
    });
  } catch (error) {
    next(error);
  }
};