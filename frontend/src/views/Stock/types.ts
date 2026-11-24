/** Tipos e interfaces para la gestión de productos, inventario y movimientos. */
import type { Producto } from '../../types';

export type VistaTabStock = 'inventario' | 'proveedores' | 'pedidos';

export type FiltroTipoProducto = 'todos' | 'bicicleta' | 'repuesto' | 'accesorio' | 'componente';
export type FiltroEstadoProducto = 'todos' | 'activos' | 'inactivos';
export type FiltroDisponibilidad = 'todos' | 'bajo_stock' | 'sin_stock' | 'optimo';

export interface FormProductoData {
  id_proveedor: number | string;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  tipo_prod: Producto['tipo_prod'];
  cantidad: number | string;
  moneda: 'ARS' | 'USD';
  costo_usd: number | string;
  porcentaje_ganancia: number | string;
  porcentaje_reventa: number | string;
  precio_reventa: number | string;
  precio_reventa_usd: number | string;
  precio: number | string;
  precio_usd: number | string;
  stock_minimo: number | string;
  color: string;
  rodado: string;
  talle: string;
  genero: '' | 'hombre' | 'mujer' | 'unisex' | 'niño/a';
  activo: boolean;
}

export interface FormMovimientoData {
  id_producto: number;
  tipo_movimiento: 'INGRESO' | 'EGRESO';
  cantidad: number | string;
  motivo: string;
  observaciones: string;
}
