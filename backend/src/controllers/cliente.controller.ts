import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { ClienteService } from '../services/cliente.service.js';
import { validarId } from '../utils/validation.js';
import { responderOk, responderCreado } from '../utils/response.js';

/** Endpoint GET /api/clientes: Consulta paginada de clientes con búsqueda libre. */
export const obtenerClientes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busqueda, limite, pagina } = req.query as { 
      busqueda?: string; 
      limite?: string; 
      pagina?: string; 
    };
    const resultado = await ClienteService.obtenerClientes({ busqueda, limite, pagina });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/clientes/:id: Consulta los datos individuales de un cliente. */
export const obtenerClientePorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese cliente.');
    const cliente = await ClienteService.obtenerClientePorId(id);
    responderOk(res, cliente);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/clientes: Registra un nuevo cliente con validación de DNI y email. */
export const crearCliente = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;
    const nuevoCliente = await ClienteService.crearCliente({
      nombre,
      apellido,
      dni,
      telefono,
      email,
      direccion,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderCreado(res, 'Cliente creado con éxito', { cliente: nuevoCliente });
  } catch (error) {
    next(error);
  }
};

/** Endpoint PUT /api/clientes/:id: Actualiza la información personal de un cliente. */
export const actualizarCliente = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese cliente.');
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;

    const clienteActualizado = await ClienteService.actualizarCliente(id, {
      nombre,
      apellido,
      dni,
      telefono,
      email,
      direccion,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, {
      message: 'Cliente actualizado con éxito',
      cliente: clienteActualizado
    });
  } catch (error) {
    next(error);
  }
};

/** Endpoint DELETE /api/clientes/:id: Elimina un cliente si no registra operaciones históricas. */
export const eliminarCliente = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese cliente.');
    const resultado = await ClienteService.eliminarCliente(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};