import type { PagoProveedor, Proveedor, MetodoPago } from '../../types';

export interface NuevoPagoData {
  nombre_proveedor: string;
  id_metodo_pago: number;
  monto_total: number | string;
  observaciones: string;
}

export type { PagoProveedor, Proveedor, MetodoPago };
