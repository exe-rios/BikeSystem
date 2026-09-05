export type TabTipo = 'general' | 'ventas' | 'reparaciones' | 'balance' | 'top_productos';
export type RangoRapido = 'todo' | 'hoy' | 'semana' | 'mes' | 'mes_anterior' | 'anio' | 'personalizado';

export interface ReportesFiltrosState {
  rangoRapido: RangoRapido;
  fechaDesde: string;
  fechaHasta: string;
  searchTerm: string;
  estadoTallerFiltro: string;
}
