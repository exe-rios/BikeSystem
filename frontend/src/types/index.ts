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
  fecha?: string;
  costo_total: number;
  cliente_nombre?: string;
  cliente_apellido?: string;
  vendedor?: string;
  detalles?: DetalleVentaItem[];
}

export interface DetalleIngresoItem {
  id_detalle_ing?: number;
  id_ingreso?: number;
  id_producto: number;
  cantidad: number;
  precio_costo: number;
  nombre?: string;
  marca?: string;
  modelo?: string;
}

export interface IngresoStock {
  id_ingreso?: number;
  id_proveedor: number;
  id_usuario?: number;
  fecha_ingreso?: string;
  num_comprobante: string;
  proveedor?: string;
  proveedor_telefono?: string;
  usuario_registro?: string;
  total_items?: number;
  monto_total_costo?: number;
  detalles?: DetalleIngresoItem[];
}

export interface DashboardFinanzas {
  ventas_mostrador: number;
  ingresos_taller: number;
  total_mes: number;
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

export interface DashboardData {
  finanzas: DashboardFinanzas;
  taller_activo: DashboardTallerActivo[];
  alertas_stock: DashboardAlertaStock[];
}