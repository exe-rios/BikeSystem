/** Tipos e interfaces del tablero y vista de inicio. */
import type { DashboardData, Venta, Reparacion } from '../../types';

export interface InicioViewProps {
  onNavigate: (view: string) => void;
}

export type { DashboardData, Venta, Reparacion };
