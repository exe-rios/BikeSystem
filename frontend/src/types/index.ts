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

export interface Venta {
  id_venta?: number;
  id_cliente: number;
  fecha: string;
  total: number;
  tipo_pago: 'Efectivo' | 'Tarjeta de Débito' | 'Tarjeta de Crédito' | 'Transferencia';
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

