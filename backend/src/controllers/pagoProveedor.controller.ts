import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { PagoProveedorService } from '../services/pagoProveedor.service.js';
import { responderOk, responderCreado } from '../utils/response.js';

/** Endpoint GET /api/pagos-proveedores/metodos-pago: Lista formas de pago para egresos. */
export const obtenerMetodosPago = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const metodos = await PagoProveedorService.obtenerMetodosPago();
    responderOk(res, metodos);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/pagos-proveedores: Consulta listado paginado de pagos a proveedores. */
export const obtenerPagos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda, limite, pagina } = req.query as { 
      busqueda?: string; 
      limite?: string; 
      pagina?: string; 
    };
    const resultado = await PagoProveedorService.obtenerPagos({ busqueda, limite, pagina });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/pagos-proveedores: Registra un comprobante de egreso a un proveedor. */
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

    responderCreado(res, 'Pago registrado exitosamente', { pago: nuevoPago });
  } catch (error) {
    next(error);
  }
};
