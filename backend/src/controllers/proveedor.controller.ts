import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { ProveedorService } from '../services/proveedor.service.js';
import { validarId } from '../utils/validation.js';
import { responderOk, responderCreado } from '../utils/response.js';

/** Endpoint GET /api/proveedores: Lista proveedores comerciales con filtro de búsqueda. */
export const obtenerProveedores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda } = req.query as { busqueda?: string };
    const resultado = await ProveedorService.obtenerProveedores(busqueda);
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/proveedores/:id: Consulta los datos de un proveedor por ID. */
export const obtenerProveedorPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese proveedor.');
    const proveedor = await ProveedorService.obtenerProveedorPorId(id);
    responderOk(res, proveedor);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/proveedores: Da de alta un nuevo proveedor comercial. */
export const crearProveedor = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre_empresa, cuit, telefono, email, direccion } = req.body;
    const nuevoProveedor = await ProveedorService.crearProveedor({
      nombre_empresa,
      cuit,
      telefono,
      email,
      direccion,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderCreado(res, 'Proveedor creado exitosamente', { proveedor: nuevoProveedor });
  } catch (error) {
    next(error);
  }
};

/** Endpoint PUT /api/proveedores/:id: Actualiza la información fiscal y de contacto de un proveedor. */
export const actualizarProveedor = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese proveedor.');
    const { nombre_empresa, cuit, telefono, email, direccion } = req.body;

    const provActualizado = await ProveedorService.actualizarProveedor(id, {
      nombre_empresa,
      cuit,
      telefono,
      email,
      direccion,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, {
      message: 'Proveedor actualizado exitosamente',
      proveedor: provActualizado
    });
  } catch (error) {
    next(error);
  }
};

/** Endpoint DELETE /api/proveedores/:id: Elimina un proveedor si no tiene pagos vinculados. */
export const eliminarProveedor = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese proveedor.');
    const resultado = await ProveedorService.eliminarProveedor(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};