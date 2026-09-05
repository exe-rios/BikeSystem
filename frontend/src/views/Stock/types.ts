import type { Producto } from '../../types';

export type FiltroTipoProducto = 'todos' | 'bicicleta' | 'repuesto' | 'accesorio' | 'componente';
export type FiltroEstadoProducto = 'todos' | 'activos' | 'inactivos';
export type FiltroDisponibilidad = 'todos' | 'bajo_stock' | 'sin_stock' | 'optimo';

export interface FormProductoData {
  nombre: string;
  marca: string;
  modelo: string;
  tipo_prod: Producto['tipo_prod'];
  cantidad: number | string;
  precio: number | string;
  stock_minimo: number | string;
  color: string;
  rodado: string;
  talle: string;
  activo: boolean;
}

export interface FormMovimientoData {
  id_producto: number;
  tipo_movimiento: 'INGRESO' | 'EGRESO';
  cantidad: number | string;
  motivo: string;
  observaciones: string;
}
