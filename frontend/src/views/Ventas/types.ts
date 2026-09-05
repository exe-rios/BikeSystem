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
    cantidad: number;
    precio_unitario: number;
    costo_total: number;
  }>;
}

export type TabVentasTipo = 'ventas' | 'garantias';
export type FiltroGarantia = 'todas' | 'vigentes' | 'por_vencer' | 'vencidas';

export interface ItemCarrito extends DetalleVentaItem {
  nombre: string;
  marca?: string;
  modelo?: string;
  tipo_prod?: string;
  stockDisponible: number;
}

export interface InfoGarantia {
  estado: 'vigente' | 'por_vencer' | 'vencida';
  diasRestantes: number;
  label: string;
  colorBg: string;
  colorText: string;
  fechaVencimiento: string;
}

export interface GarantiaConEstado extends GarantiaBicicleta {
  infoGarantia: InfoGarantia;
}
