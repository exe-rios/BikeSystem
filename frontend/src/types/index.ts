export interface Usuario {
  id_usuario?: number;
  nombre_usuario: string;
  contrasena?: string;
  rol: 'ADMIN' | 'SUPERADMIN' | 'EMPLEADO';
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
  numero_serie: string;
  marca: string;
  modelo: string;
  color: string;
  rodado: string;
  talle: string;
  precio: number;
}

export interface Reparacion {
  id_reparacion?: number;
  id_bicicleta: number;
  descripcion_falla: string;
  costo_estimado: number;
  estado: 'Recibida' | 'En Reparación' | 'Lista' | 'Entregada';
  fecha_ingreso: string;
}

export interface Producto {
  id_producto?: number;
  nombre: string;
  categoria: 'Repuesto' | 'Accesorio' | 'Componente';
  precio_venta: number;
  cantidad: number;
  stock_minimo: number;
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
  monto_total: number;
  observaciones?: string;
}

// --- NUEVAS EXTENSIONES Y TIPOS PARA EL MÓDULO DE VENTAS Y STOCK ---

export interface ProductoStock {
  id_producto: number;
  nombre: string;
  marca: string;
  modelo: string;
  tipo_producto: 'bicicleta' | 'accesorio' | 'repuesto';
  cantidad: number;
  precio: number;
  numero_serie?: string;
  color?: string;
  rodado?: string;
  talle?: string;
}

export interface DetalleVentaItem {
  id_producto: number;
  nombre: string;
  tipo_producto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  numero_serie?: string;
  marca?: string;
  modelo?: string;
  color?: string;
  rodado?: string;
  talle?: string;
}

export interface Venta {
  id_venta?: number;
  id_cliente: number;
  fecha: string;
  total: number;
  tipo_pago: 'Efectivo' | 'Tarjeta de Débito' | 'Tarjeta de Crédito' | 'Transferencia';
  detalles?: DetalleVentaItem[];
}