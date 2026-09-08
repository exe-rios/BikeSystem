import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { VentaService } from '../services/venta.service.js';
import { validarId } from '../utils/validation.js';
import { responderOk, responderCreado } from '../utils/response.js';

/** Endpoint POST /api/ventas: Registra una nueva venta comercial y descuenta stock. */
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

    responderCreado(res, 'Venta registrada con éxito', resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/ventas: Consulta paginada de ventas comerciales. */
export const obtenerVentas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda, limite, pagina } = req.query as { busqueda?: string; limite?: string; pagina?: string };
    const resultado = await VentaService.obtenerVentas(busqueda, {
      limite: limite ? Number(limite) : undefined,
      pagina: pagina ? Number(pagina) : undefined
    });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/ventas/:id: Obtiene comprobante con detalle de ítems de la venta. */
export const obtenerVentaPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'El número de factura no es válido.');
    const resultado = await VentaService.obtenerVentaPorId(id);
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/ventas/:id/anular: Anula una factura y reintegra stock al inventario. */
export const anularVenta = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'El número de venta no es válido.');
    const motivo = req.body.motivo || req.body.motivo_anulacion;

    const resultado = await VentaService.anularVenta(id, motivo, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/ventas/metodos-pago: Lista opciones de pago para facturación. */
export const obtenerMetodosPago = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const metodos = await VentaService.obtenerMetodosPago();
    responderOk(res, metodos);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/ventas/garantias: Consulta cobertura y vencimiento de garantías en bicicletas. */
export const obtenerGarantiasBicicletas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda, limite, pagina } = req.query as { busqueda?: string; limite?: string; pagina?: string };
    const resultado = await VentaService.obtenerGarantiasBicicletas(busqueda, {
      limite: limite ? Number(limite) : undefined,
      pagina: pagina ? Number(pagina) : undefined
    });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/ventas/detalle: Agrega un artículo adicional a una venta abierta. */
export const agregarDetalleVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_venta, id_producto, cantidad, precio_unitario } = req.body;
    const idVentaNum = validarId(id_venta, 'El número de venta no es válido.');
    const resultado = await VentaService.agregarDetalleVenta(idVentaNum, {
      id_producto,
      cantidad,
      precio_unitario
    });
    responderCreado(res, 'Artículo agregado a la venta con éxito', { detalle: resultado });
  } catch (error) {
    next(error);
  }
};