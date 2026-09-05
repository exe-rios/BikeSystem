import type { Bicicleta, Cliente } from '../../types';

export interface NuevaBicicletaData {
  id_cliente: number;
  marca: string;
  modelo: string;
}

export interface BicicletaEditData {
  id_bicicleta: number;
  marca: string;
  modelo: string;
}

export interface RepuestoUtilizadoHistorial {
  id_detalle_rep: number;
  cantidad: number;
  precio_unitario: number;
  costo_total: number;
  repuesto_nombre: string;
  repuesto_marca?: string;
}

export interface ReparacionHistorialItem {
  id_reparacion: number;
  fecha_ingreso: string;
  fecha_egreso: string | null;
  estado: string;
  descripcion: string;
  costo_mano_obra: number;
  costo_total: number;
  mecanico: string;
  repuestos_utilizados: RepuestoUtilizadoHistorial[];
}

export interface FichaHistorialBicicleta {
  bicicleta: Bicicleta & {
    cliente_nombre?: string;
    cliente_apellido?: string;
    cliente_dni?: string;
    cliente_telefono?: string;
    cliente_email?: string;
  };
  historial_reparaciones: ReparacionHistorialItem[];
  total_reparaciones: number;
}

export type { Bicicleta, Cliente };
