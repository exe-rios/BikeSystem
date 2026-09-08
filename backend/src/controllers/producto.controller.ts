import type { Request, Response, NextFunction } from 'express';
import type { PeticionConUsuario } from '../middlewares/auth.middleware.js';
import { ProductoService, PRODUCTO_SELECT } from '../services/producto.service.js';
import { validarId } from '../utils/validation.js';
import { responderOk, responderCreado } from '../utils/response.js';

export { PRODUCTO_SELECT };

/** Endpoint GET /api/productos: Consulta paginada del inventario con filtros y métricas globales. */
export const obtenerProductos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tipo_prod, tipo, busqueda, estado_stock, disponibilidad, estado, solo_activos, limite, pagina } = req.query as {
      tipo_prod?: string;
      tipo?: string;
      busqueda?: string;
      estado_stock?: string;
      disponibilidad?: string;
      estado?: string;
      solo_activos?: string;
      limite?: string;
      pagina?: string;
    };
    const resultado = await ProductoService.obtenerProductos({
      tipo_prod,
      tipo,
      busqueda,
      estado_stock,
      disponibilidad,
      estado,
      solo_activos,
      limite,
      pagina
    });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/productos/:id: Consulta los datos completos de un producto específico. */
export const obtenerProductoPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese producto.');
    const producto = await ProductoService.obtenerProductoPorId(id);
    responderOk(res, producto);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/productos: Agrega un nuevo producto o bicicleta al catálogo. */
export const crearProducto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const nuevoProducto = await ProductoService.crearProducto(req.body, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderCreado(res, 'Producto creado exitosamente', { producto: nuevoProducto });
  } catch (error) {
    next(error);
  }
};

/** Endpoint PUT /api/productos/:id: Actualiza precios, cantidades y atributos del producto. */
export const actualizarProducto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese producto.');
    const productoActualizado = await ProductoService.actualizarProducto(id, req.body, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, {
      message: 'Producto actualizado exitosamente',
      producto: productoActualizado
    });
  } catch (error) {
    next(error);
  }
};

/** Endpoint DELETE /api/productos/:id: Desactiva un producto del catálogo (baja lógica). */
export const eliminarProducto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese producto.');
    const resultado = await ProductoService.eliminarProducto(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint PATCH /api/productos/:id/reactivar: Restaura un producto inactivo en el catálogo. */
export const reactivarProducto = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese producto.');
    const resultado = await ProductoService.reactivarProducto(id, {
      idUsuarioOperador: req.usuarioToken?.id,
      nombreUsuarioOperador: req.usuarioToken?.nombre_usuario
    });

    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint POST /api/productos/:id/ajuste: Aplica correcciones de inventario con asiento en Kardex. */
export const ajustarStock = async (req: PeticionConUsuario, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id || req.body.id_producto, 'No se encontró ese producto.');
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

    responderOk(res, {
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

/** Endpoint GET /api/productos/movimientos: Consulta auditoría de movimientos de stock. */
export const obtenerMovimientosStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id_producto = req.params.id || req.query.id_producto;
    const busqueda = req.query.busqueda as string | undefined;
    const resultado = await ProductoService.obtenerMovimientosStock({
      id_producto: id_producto ? Number(id_producto) : undefined,
      busqueda
    });
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};

/** Endpoint GET /api/productos/:id/kardex: Devuelve el historial de movimientos de un ítem. */
export const obtenerKardex = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = validarId(req.params.id, 'No se encontró ese producto.');
    const resultado = await ProductoService.obtenerKardex(id);
    responderOk(res, resultado);
  } catch (error) {
    next(error);
  }
};