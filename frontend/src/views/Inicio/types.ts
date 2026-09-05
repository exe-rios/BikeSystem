import type { DashboardData, Venta, Reparacion } from '../../types';

export interface InicioViewProps {
  onNavigate: (view: string) => void;
}

export type { DashboardData, Venta, Reparacion };
