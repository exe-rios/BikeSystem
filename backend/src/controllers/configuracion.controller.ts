import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { ConfiguracionService } from '../services/configuracion.service.js';
import { responderOk } from '../utils/response.js';

/** Endpoint GET /api/configuracion/dolar: Retorna la cotización vigente del dólar. */
export const obtenerCotizacionDolar = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const info = await ConfiguracionService.obtenerCotizacionDolar();
    responderOk(res, info);
  } catch (error) {
    next(error);
  }
};

/** Endpoint PUT /api/configuracion/dolar: Actualiza la cotización manual del dólar y recalcula productos en USD. */
export const actualizarCotizacionDolar = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { cotizacion_dolar } = req.body;
    const resultado = await ConfiguracionService.actualizarCotizacionDolar(cotizacion_dolar, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};
