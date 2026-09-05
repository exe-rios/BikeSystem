import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { ProductoService, PRODUCTO_SELECT } from '../services/producto.service.js';

export { PRODUCTO_SELECT };

export const obtenerProductos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tipo_prod, tipo, busqueda, estado_stock, disponibilidad, estado, solo_activos } = req.query as {
      tipo_prod?: string;
      tipo?: string;
      busqueda?: string;
      estado_stock?: string;
      disponibilidad?: string;
      estado?: string;
      solo_activos?: string;
    };
    const resultado = await ProductoService.obtenerProductos({
      tipo_prod,
      tipo,
      busqueda,
      estado_stock,
      disponibilidad,
      estado,
      solo_activos
    });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerProductoPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const producto = await ProductoService.obtenerProductoPorId(id);
    res.status(200).json(producto);
  } catch (error) {
    next(error);
  }
};

export const crearProducto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const nuevoProducto = await ProductoService.crearProducto(req.body, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(201).json({
      message: 'Producto creado exitosamente',
      producto: nuevoProducto
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarProducto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const productoActualizado = await ProductoService.actualizarProducto(id, req.body, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json({
      message: 'Producto actualizado exitosamente',
      producto: productoActualizado
    });
  } catch (error) {
    next(error);
  }
};

export const eliminarProducto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await ProductoService.eliminarProducto(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const reactivarProducto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await ProductoService.reactivarProducto(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const ajustarStock = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id || req.body.id_producto);
    const cantidad_ajuste = req.body.cantidad_ajuste !== undefined ? req.body.cantidad_ajuste : req.body.cantidad;
    const { tipo_movimiento, motivo, observaciones } = req.body;

    const resultado = await ProductoService.ajustarStock(id, {
      cantidad_ajuste,
      tipo_movimiento,
      motivo,
      observaciones,
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    res.status(200).json({
      message: resultado.message,
      movimiento: {
        id_producto: id,
        tipo_movimiento,
        cantidad: Number(cantidad_ajuste),
        motivo,
        observaciones
      },
      nuevo_stock: resultado.nuevo_stock,
      producto: resultado.producto
    });
  } catch (error) {
    next(error);
  }
};

export const registrarMovimientoStock = ajustarStock;

export const obtenerMovimientosStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id_producto = req.params.id || req.query.id_producto;
    const busqueda = req.query.busqueda as string | undefined;
    const resultado = await ProductoService.obtenerMovimientosStock({
      id_producto: id_producto ? Number(id_producto) : undefined,
      busqueda
    });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerKardex = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await ProductoService.obtenerKardex(id);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};