/** Tipos e interfaces del módulo de ventas, comprobantes y garantías. */
import type { Venta, DetalleVentaItem, GarantiaBicicleta } from '../../types';

export interface VentaDetallada {
  venta: Venta & {
    cliente_nombre?: string;
    cliente_apellido?: string;
    cliente_dni?: string;
    cliente_telefono?: string;
    cliente_email?: string;
    cliente_direccion?: string;
    vendedor?: string;
    metodo_pago_nombre?: string;
  };
  productos_vendidos: Array<{
    id_detalle_venta: number;
    id_producto: number;
    nombre: string;
    marca?: string;
    modelo?: string;
    tipo_prod?: string;
    numero_serie?: string;
    color?: string;
    rodado?: string;
    talle?: string;
    genero?: string;
    cantidad: number;
    precio_unitario: number;
    costo_total: number;
  }>;
}

export type TabVentasTipo = 'ventas' | 'garantias';
export type FiltroGarantia = 'todas' | 'service_pendiente' | 'vigentes' | 'por_vencer' | 'concluidas';

export interface ItemCarrito extends DetalleVentaItem {
  nombre: string;
  marca?: string;
  modelo?: string;
  tipo_prod?: string;
  genero?: string;
  stockDisponible: number;
}

export type EstadoGarantiaVisual = 
  | 'service_pendiente'
  | 'service_por_vencer'
  | 'caducada_sin_service'
  | 'vigente'
  | 'por_vencer'
  | 'concluida';

export interface InfoGarantia {
  estado: EstadoGarantiaVisual;
  diasRestantes: number;
  label: string;
  sublabel?: string;
  colorBg: string;
  colorText: string;
  fechaVencimiento: string;
}

export interface GarantiaConEstado extends GarantiaBicicleta {
  infoGarantia: InfoGarantia;
}

