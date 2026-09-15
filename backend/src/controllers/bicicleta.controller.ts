import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { BicicletaService } from '../services/bicicleta.service.js';
import { validarId } from '../utils/validation.js';
import { responderOk, responderCreado } from '../utils/response.js';

/** Endpoint GET /api/bicicletas: Consulta paginada con filtros por cliente o búsqueda de texto. */
export const obtenerBicicletas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_cliente, busqueda, limite, pagina } = req.query as { 
      id_cliente?: string; 
      busqueda?: string; 
      limite?: string; 
      pagina?: string; 
    };
    const resultado = await BicicletaService.obtenerBicicletas({ id_cliente, busqueda, limite, pagina });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/bicicletas/:id: Obtiene información puntual de una bicicleta. */
export const obtenerBicicletaPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró esa bicicleta.');
    const bicicleta = await BicicletaService.obtenerBicicletaPorId(id);
    responderOk(res, bicicleta);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/bicicletas: Registra una nueva bicicleta asignada a un cliente. */
export const crearBicicleta = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id_cliente, marca, modelo } = req.body;
    const nuevaBici = await BicicletaService.crearBicicleta({
      id_cliente,
      marca,
      modelo,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderCreado(res, 'Bicicleta registrada con éxito', { bicicleta: nuevaBici });
  } catch (error) {
    next(error);
  }
};

/** Endpoint PUT /api/bicicletas/:id: Modifica los datos de una bicicleta existente. */
export const actualizarBicicleta = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró esa bicicleta.');
    const { marca, modelo } = req.body;

    const biciActualizada = await BicicletaService.actualizarBicicleta(id, {
      marca,
      modelo,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, {
      message: 'Bicicleta actualizada con éxito',
      bicicleta: biciActualizada
    });
  } catch (error) {
    next(error);
  }
};

/** Endpoint DELETE /api/bicicletas/:id: Da de baja una bicicleta sin órdenes vinculadas. */
export const eliminarBicicleta = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró esa bicicleta.');
    const resultado = await BicicletaService.eliminarBicicleta(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/bicicletas/:id/historial: Consulta todas las órdenes de taller de la bicicleta. */
export const obtenerHistorialBicicleta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró esa bicicleta.');
    const resultado = await BicicletaService.obtenerHistorialBicicleta(id);
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};