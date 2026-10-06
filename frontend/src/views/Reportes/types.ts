/** Tipos e interfaces para el módulo de analítica y reportes financieros. */
export type TabTipo = 'general' | 'ventas' | 'reparaciones' | 'balance' | 'top_productos' | 'inventario';
export type RangoRapido = 'todo' | 'hoy' | 'semana' | 'mes' | 'mes_anterior' | 'anio' | 'personalizado';

export interface ReportesFiltrosState {
  rangoRapido: RangoRapido;
  fechaDesde: string;
  fechaHasta: string;
  searchTerm: string;
  estadoTallerFiltro: string;
}

export type ClaveGama = 'todas' | 'economica' | 'intermedia' | 'alta';

export interface SegmentoGama {
  clave: 'economica' | 'intermedia' | 'alta';
  nombre: string;
  rango_texto: string;
  modelos: number;
  unidades: number;
  capital_inmovilizado: number;
  porcentaje_unidades: number;
  porcentaje_capital: number;
  precio_promedio: number;
}

export interface BicicletaCapital {
  id_producto: number;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  tipo_prod: string;
  precio_unitario: number;
  stock_disponible: number;
  stock_minimo: number;
  capital_inmovilizado: number;
  rodado?: string | null;
  talle?: string | null;
  color?: string | null;
  genero?: string | null;
  gama: 'economica' | 'intermedia' | 'alta';
  unidades_vendidas_90d: number;
  monto_vendido_90d: number;
  estado_rotacion: 'alta_rotacion' | 'rotacion_regular' | 'estancada';
}

export interface DesgloseTipoProducto {
  tipo_prod: string;
  total_articulos: number;
  total_unidades: number;
  capital_inmovilizado: number;
  porcentaje_capital: number;
}

export interface ResumenCapitalStock {
  capital_total_inventario: number;
  unidades_total_inventario: number;
  capital_total_bicicletas: number;
  unidades_total_bicicletas: number;
  modelos_activos_bicicletas: number;
  porcentaje_bicicletas_capital: number;
  precio_promedio_bicicleta: number;
  precio_minimo_bicicleta: number;
  precio_maximo_bicicleta: number;
  capital_estancado: number;
  unidades_estancadas: number;
  porcentaje_capital_estancado: number;
}

export interface ReporteCapitalStockResponse {
  umbrales: {
    gamaBajaMax: number;
    gamaMediaMax: number;
  };
  resumen: ResumenCapitalStock;
  desglose_por_tipo: DesgloseTipoProducto[];
  gamas: SegmentoGama[];
  bicicletas: BicicletaCapital[];
}

