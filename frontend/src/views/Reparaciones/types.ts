import type { Reparacion, Bicicleta, Producto, DetalleReparacionItem } from '../../types';

export type VistaTabReparaciones = 'activo' | 'historial';

export interface NuevaReparacionData {
  id_bicicleta: number;
  descripcion: string;
  costo_mano_obra: number | string;
  estado: Reparacion['estado'];
}

export interface ColumnaKanban {
  titulo: string;
  estado: Reparacion['estado'];
  colorBg: string;
}

export type { Reparacion, Bicicleta, Producto, DetalleReparacionItem };
