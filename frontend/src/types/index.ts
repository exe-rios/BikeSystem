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

export interface Producto {
  id_producto?: number;
  nombre: string;
  marca?: string;
  modelo?: string;
  tipo_prod: 'bicicleta' | 'repuesto' | 'accesorio' | 'componente';
  cantidad: number | string;
  numero_serie?: string;
  color?: string;
  rodado?: string;
  talle?: string;
  precio: number | string;
  stock_minimo: number | string;
  activo?: boolean;
  estado_stock?: 'optimo' | 'bajo_stock' | 'sin_stock';
}

export interface ResumenStock {
  total_articulos: number;
  total_unidades: number;
  bajo_stock_count: number;
  inactivos_count: number;
}

export interface Proveedor {
  id_proveedor?: number;
  nombre_empresa: string;
  cuit: string;
  telefono: string;
  email: string;
  direccion: string;
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
  observaciones?: string;
}

export interface DetalleVentaItem {
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
  dias_restantes?: number;
  estado_garantia?: 'vigente' | 'por_vencer' | 'vencida';
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
  id_cliente: number;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_dni?: string;
  cliente_telefono?: string;
  cliente_email?: string;
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
  total_recaudado: number;
}

export interface DashboardData {
  finanzas: DashboardFinanzas;
  taller_activo: DashboardTallerActivo[];
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
  total_facturado: number;
  ventas_cobradas: number;
  ventas_anuladas: number;
  ventas: Venta[];
}

export interface ReporteReparacionesResponse {
  total: number;
  entregadas_count: number;
  en_proceso_count: number;
  total_recaudado: number;
  total_mano_obra: number;
  monto_estimado_en_proceso: number;
  reparaciones: Reparacion[];
}

export interface ReporteEgresosResponse {
  total: number;
  total_egresos: number;
  pagos: PagoProveedor[];
}