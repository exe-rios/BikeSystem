/** Definiciones de tipos e interfaces TypeScript compartidas en el frontend. */
export interface Usuario {
  id_usuario?: number;
  nombre_usuario: string;
  contrasena?: string;
  rol: 'ADMIN' | 'SUPERADMIN' | 'EMPLEADO' | string;
}

export interface Cliente {
  id_cliente?: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface Bicicleta {
  id_bicicleta?: number;
  id_cliente: number;
  marca: string;
  modelo: string;
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  email?: string;
}

export interface Reparacion {
  id_reparacion?: number;
  id_bicicleta: number;
  id_usuario?: number;
  fecha_ingreso?: string;
  fecha_egreso?: string | null;
  estado: 'Recibida' | 'En Reparación' | 'Lista' | 'Entregada';
  descripcion: string;
  costo_mano_obra?: number | string;
  costo_total?: number | string;
  marca?: string;
  modelo?: string;
  cliente_nombre?: string;
  cliente_apellido?: string;
  cliente_dni?: string;
  mecanico?: string;
}

export interface DetalleReparacionItem {
  id_detalle_rep?: number;
  id_reparacion: number;
  id_producto: number;
  cantidad: number | string;
  precio_unitario: number | string;
  costo_total: number | string;
  nombre?: string;
  marca?: string;
  modelo?: string;
  tipo_prod?: string;
}

export type GeneroBicicleta = 'hombre' | 'mujer' | 'unisex' | 'niño/a';

export interface Producto {
  id_producto?: number;
  id_proveedor?: number | null;
  proveedor_nombre?: string | null;
  proveedor_cotizacion_dolar?: number | string | null;
  codigo?: string | null;
  nombre: string;
  marca?: string;
  modelo?: string;
  tipo_prod: 'bicicleta' | 'repuesto' | 'accesorio' | 'componente';
  cantidad: number | string;
  numero_serie?: string;
  color?: string;
  rodado?: string;
  talle?: string;
  genero?: GeneroBicicleta | string;
  precio: number | string;
  moneda?: 'ARS' | 'USD';
  precio_usd?: number | string | null;
  costo_usd?: number | string | null;
  porcentaje_ganancia?: number | string | null;
  porcentaje_reventa?: number | string | null;
  precio_reventa?: number | string | null;
  precio_reventa_usd?: number | string | null;
  stock_minimo: number | string;
  activo?: boolean;
  estado_stock?: 'optimo' | 'bajo_stock' | 'sin_stock';
}

export interface PagoProveedorPendiente {
  id_pendiente: number;
  id_proveedor: number;
  proveedor_nombre?: string | null;
  id_usuario: number;
  usuario_nombre?: string | null;
  id_pago_inicial?: number | null;
  numero_factura?: string | null;
  fecha_factura?: string | null;
  monto_factura_total: number | string;
  monto_pagado: number | string;
  saldo_pendiente: number | string;
  moneda: 'ARS' | 'USD';
  fecha_proximo_pago: string;
  dias_restantes?: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'CANCELADO';
  observaciones?: string | null;
  created_at?: string;
}

export interface CotizacionDolarInfo {
  cotizacion_dolar: number;
  updated_at: string | null;
  updated_by_nombre: string | null;
  productos_usd_count: number;
}

export interface CotizacionProveedorInput {
  nombre_proveedor: string;
  cotizacion_dolar: number;
}

export interface ItemCargaMasivaInput {
  id_producto?: number;
  codigo?: string;
  nombre: string;
  tipo_prod: 'bicicleta' | 'repuesto' | 'accesorio' | string;
  marca?: string;
  modelo?: string;
  nombre_proveedor?: string;
  cantidad?: number | string;
  stock_minimo?: number | string;
  precio?: number | string;
  precio_usd?: number | string;
  costo_usd?: number | string;
  porcentaje_ganancia?: number | string;
  porcentaje_reventa?: number | string;
  precio_reventa?: number | string;
  precio_reventa_usd?: number | string;
  moneda?: 'ARS' | 'USD' | string;
  color?: string;
  rodado?: string;
  talle?: string;
  genero?: string;
  modo_stock?: 'sumar' | 'reemplazar';
}

export interface PreviewCargaMasivaItem {
  fila: number;
  accion: 'CREAR' | 'ACTUALIZAR';
  id_producto_existente: number | null;
  codigo?: string | null;
  nombre: string;
  tipo_prod: string;
  marca: string | null;
  modelo: string | null;
  nombre_proveedor?: string | null;
  cotizacion_aplicada?: number;
  cantidad_archivo: number;
  stock_actual: number;
  stock_resultante: number;
  moneda: 'ARS' | 'USD';
  precio_usd: number | null;
  costo_usd?: number | null;
  porcentaje_ganancia?: number | null;
  porcentaje_reventa?: number | null;
  precio_reventa?: number | null;
  precio_reventa_usd?: number | null;
  precio_ars: number;
  precio_actual_ars: number | null;
  stock_minimo: number;
  genero: string | null;
  color: string | null;
  rodado: string | null;
  talle: string | null;
  errores: string[];
}

export interface PreviewCargaMasivaResponse {
  proveedor: { id_proveedor: number | null; nombre_empresa: string | null };
  cotizacion_dolar: number;
  resumen: {
    total_filas: number;
    nuevos: number;
    actualizar: number;
    con_errores: number;
  };
  items: PreviewCargaMasivaItem[];
}

export interface AumentoMasivoItem {
  id_producto: number;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  tipo_prod: string;
  moneda: 'ARS' | 'USD';
  costo_actual?: number | null;
  costo_nuevo?: number | null;
  porcentaje_ganancia?: number | null;
  precio_usd_actual: number | null;
  precio_usd_nuevo: number | null;
  precio_ars_actual: number;
  precio_ars_nuevo: number;
}

export interface AumentoMasivoResponse {
  preview: boolean;
  message?: string;
  proveedor: { id_proveedor: number | null; nombre_empresa: string };
  cotizacion_dolar: number;
  total_afectados: number;
  resumen_moneda: { usd: number; ars: number };
  items: AumentoMasivoItem[];
}

export interface ResumenStock {
  total_articulos: number;
  total_unidades: number;
  bajo_stock_count: number;
  sin_stock_count?: number;
  inactivos_count: number;
}

export interface Proveedor {
  id_proveedor?: number;
  nombre_empresa: string;
  cuit: string;
  telefono: string;
  email: string;
  direccion: string;
  cotizacion_dolar?: number | string | null;
  productos_count?: number;
  productos_usd_count?: number;
}

export interface MetodoPago {
  id_metodo_pago: number;
  nombre: string;
}

export interface PagoProveedor {
  id_pago?: number;
  id_proveedor: number;
  proveedor_nombre?: string;
  id_usuario: number;
  usuario_nombre?: string;
  id_metodo_pago: number;
  metodo_pago_nombre?: string;
  fecha?: string;
  monto_total: number | string;
  moneda?: 'ARS' | 'USD';
  monto_usd?: number | string | null;
  cotizacion_dolar?: number | string | null;
  observaciones?: string;
}

export interface DetalleVentaItem {
  id_detalle_venta?: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  costo_total?: number;
  nombre?: string;
  marca?: string;
  modelo?: string;
  tipo_prod?: string;
  numero_serie?: string;
  color?: string;
  rodado?: string;
  talle?: string;
  genero?: string;
}

export interface Venta {
  id_venta?: number;
  id_cliente: number;
  id_usuario?: number;
  id_metodo_pago?: number;
  metodo_pago_nombre?: string;
  fecha?: string;
  costo_total: number;
  estado?: 'COMPLETADA' | 'ANULADA';
  fecha_anulacion?: string | null;
  motivo_anulacion?: string | null;
  cliente_nombre?: string;
  cliente_apellido?: string;
  cliente_dni?: string;
  es_consumidor_final?: boolean;
  vendedor?: string;
  detalles?: DetalleVentaItem[];
}

export interface MovimientoStock {
  id_movimiento?: number;
  id_producto: number;
  producto_nombre?: string;
  producto_marca?: string;
  producto_modelo?: string;
  id_usuario: number;
  usuario_nombre?: string;
  tipo_movimiento: 'INGRESO' | 'EGRESO';
  cantidad: number;
  motivo: string;
  observaciones?: string;
  created_at?: string;
}

export interface BitacoraActividad {
  id_bitacora?: number;
  id_usuario?: number | null;
  nombre_usuario: string;
  modulo: string;
  accion: string;
  descripcion?: string;
  created_at?: string;
}

export interface GarantiaBicicleta {
  id_venta: number;
  id_bicicleta?: number;
  fecha_venta: string;
  fecha_vencimiento: string;
  fecha_limite_service?: string;
  fecha_vencimiento_extendida?: string;
  primer_service_realizado: boolean;
  fecha_primer_service?: string | null;
  observaciones_service?: string | null;
  service_excepcion?: boolean;
  usuario_service?: string | null;
  dias_restantes?: number;
  estado_garantia?: 'service_pendiente' | 'service_por_vencer' | 'caducada_sin_service' | 'vigente' | 'por_vencer' | 'concluida' | 'vencida';
  id_detalle_venta: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  producto_nombre: string;
  marca?: string;
  modelo?: string;
  color?: string;
  rodado?: string;
  talle?: string;
  genero?: string;
  id_cliente: number;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_dni?: string;
  cliente_telefono?: string;
  cliente_email?: string;
  es_consumidor_final?: boolean;
  vendedor?: string;
}

export interface DashboardFinanzas {
  ventas_mostrador: number;
  ingresos_taller: number;
  total_mes: number;
  egresos_proveedores: number;
  balance_neto_mes: number;
}

export interface DashboardTallerActivo {
  estado: string;
  cantidad: string | number;
}

export interface DashboardAlertaStock {
  id_producto: number;
  nombre: string;
  marca: string;
  cantidad: number;
  stock_minimo: number;
}

export interface DashboardTopProducto {
  id_producto: number;
  nombre: string;
  tipo_prod: string;
  marca: string | null;
  total_vendido: number;
  total_recaudado?: number;
}

export interface DashboardData {
  finanzas: DashboardFinanzas | null;
  taller_activo: DashboardTallerActivo[];
  total_taller_activo?: number;
  alertas_stock: DashboardAlertaStock[];
  top_productos: DashboardTopProducto[];
}

export interface ReporteKPIs {
  total_ingresos: number;
  total_ventas_monto: number;
  total_ventas_cantidad: number;
  total_reparaciones_monto: number;
  total_reparaciones_cantidad: number;
  total_mano_obra_monto: number;
  total_egresos_monto: number;
  total_egresos_cantidad: number;
  balance_neto: number;
  margen_rentabilidad: number;
  total_operaciones_cobradas: number;
  ticket_promedio: number;
  porcentaje_ventas: number;
  porcentaje_taller: number;
  monto_estimado_en_proceso: number;
  total_ordenes_en_proceso: number;
}

export interface ReporteEstadisticasTaller {
  recibidas: number;
  en_reparacion: number;
  listas: number;
  entregadas: number;
}

export interface ReporteEstadisticasResponse {
  kpis: ReporteKPIs;
  estadisticas_taller: ReporteEstadisticasTaller;
}

export interface ReporteVentasResponse {
  total: number;
  pagina?: number;
  limite?: number;
  totalPaginas?: number;
  total_facturado: number;
  ventas_cobradas: number;
  ventas_anuladas: number;
  ventas: Venta[];
}

export interface ReporteReparacionesResponse {
  total: number;
  pagina?: number;
  limite?: number;
  totalPaginas?: number;
  entregadas_count: number;
  en_proceso_count: number;
  total_recaudado: number;
  total_mano_obra: number;
  monto_estimado_en_proceso?: number;
  reparaciones: Reparacion[];
}

export interface ReporteEgresosResponse {
  total: number;
  pagina?: number;
  limite?: number;
  totalPaginas?: number;
  total_egresos: number;
  pagos: PagoProveedor[];
}

export type {
  ReporteCapitalStockResponse,
  SegmentoGama,
  BicicletaCapital,
  ResumenCapitalStock,
  DesgloseTipoProducto,
  ClaveGama
} from '../views/Reportes/types';