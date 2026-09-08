import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { ReparacionService } from '../services/reparacion.service.js';
import { validarId } from '../utils/validation.js';
import { responderOk, responderCreado } from '../utils/response.js';

/** Endpoint GET /api/reparaciones: Lista órdenes de taller con métricas y filtros por estado. */
export const obtenerReparaciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { estado, busqueda, limite, pagina } = req.query as { 
      estado?: string; 
      busqueda?: string; 
      limite?: string; 
      pagina?: string; 
    };
    const resultado = await ReparacionService.obtenerReparaciones({ estado, busqueda, limite, pagina });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/reparaciones/:id: Detalle de la orden junto con su lista de repuestos. */
export const obtenerReparacionPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró esa orden de taller.');
    const resultado = await ReparacionService.obtenerReparacionPorId(id);
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/reparaciones: Registra el ingreso de una bicicleta al taller. */
export const crearReparacion = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_bicicleta, id_usuario, estado, descripcion, costo_mano_obra } = req.body;
    const nuevaRep = await ReparacionService.crearReparacion({
      id_bicicleta,
      id_usuario: req.usuarioToken?.id || id_usuario,
      estado,
      descripcion,
      costo_mano_obra,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderCreado(res, 'Bicicleta ingresada al taller con éxito', { reparacion: nuevaRep });
  } catch (error) {
    next(error);
  }
};

/** Endpoint PUT /api/reparaciones/:id: Actualiza estado, mano de obra o diagnóstico de la orden. */
export const actualizarEstadoReparacion = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró esa orden de taller.');
    const { estado, descripcion, costo_mano_obra } = req.body;

    const repActualizada = await ReparacionService.actualizarEstadoReparacion(id, {
      estado,
      descripcion,
      costo_mano_obra,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, {
      message: 'Orden de taller actualizada exitosamente',
      reparacion: repActualizada
    });
  } catch (error) {
    next(error);
  }
};