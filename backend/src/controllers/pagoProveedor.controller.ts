import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { PagoProveedorService } from '../services/pagoProveedor.service.js';
import { validarId } from '../utils/validation.js';
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
    const { id_proveedor, nombre_proveedor, id_metodo_pago, monto_total, moneda, monto_usd, cotizacion_dolar, observaciones } = req.body;
    const nuevoPago = await PagoProveedorService.crearPago({
      id_proveedor,
      nombre_proveedor,
      id_metodo_pago,
      monto_total,
      moneda,
      monto_usd,
      cotizacion_dolar,
      observaciones,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderCreado(res, 'Pago registrado exitosamente', { pago: nuevoPago });
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/pagos-proveedores/pendientes: Lista los próximos pagos agendados a proveedores. */
export const obtenerPagosPendientes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resultado = await PagoProveedorService.obtenerPagosPendientes();
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/pagos-proveedores/pendientes/:id/pagar: Registra un pago total o parcial de un saldo agendado. */
export const registrarAbonoPendiente = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idPendiente = validarId(req.params.id, 'No se encontró ese pago pendiente.');
    const { id_metodo_pago, monto_abono, cotizacion_dolar, nueva_fecha_proximo_pago, observaciones } = req.body || {};
    const resultado = await PagoProveedorService.registrarAbonoPendiente(idPendiente, {
      id_metodo_pago,
      monto_abono,
      cotizacion_dolar,
      nueva_fecha_proximo_pago,
      observaciones,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};
