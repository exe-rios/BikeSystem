import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { DetalleReparacionService } from '../services/detalleReparacion.service.js';
import { validarId } from '../utils/validation.js';
import { responderOk, responderCreado } from '../utils/response.js';

/** Endpoint POST /api/detalle-reparacion: Asigna repuestos a una orden de taller y descuenta inventario. */
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

    responderCreado(res, 'Repuesto asignado con éxito a la orden', resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/detalle-reparacion/:id_reparacion: Lista los repuestos consumidos en una orden. */
export const obtenerRepuestosDeReparacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id_reparacion = validarId(req.params.id_reparacion, 'No se encontró esa orden de taller.');
    const resultado = await DetalleReparacionService.obtenerRepuestosDeReparacion(id_reparacion);
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint DELETE /api/detalle-reparacion/:id: Desvincula un repuesto y reintegra las unidades al stock. */
export const eliminarRepuesto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id_detalle_rep || req.params.id, 'No se encontró ese repuesto en la orden.');
    const resultado = await DetalleReparacionService.eliminarRepuesto(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};