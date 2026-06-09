export interface Usuario {
  id_usuario?: number;
  Nom_usuario: string;
  rol: 'dueño' | 'empleado'; // Alineado con RF26 y tu DDL
}

export interface Cliente {
  id_cliente?: number;
  Nombre: string;
  Apellido: string;
  Dni: string;
  Telefono: string;
  Email: string;
  Direccion: string;
}

export interface Bicicleta {
  id_bicicleta?: number;
  id_cliente: number; // Relación FK restricta de tu BD
  Num_serie: string;
  marca: string;
  modelo: string;
  color: string;
  rodado: string;
  talle: string;
  Precio: number;
}
export interface Venta {
  id_venta?: number;
  id_cliente: number;
  fecha: string;
  total: number;
  tipo_pago: 'Efectivo' | 'Tarjeta' | 'Transferencia';
}

export interface Reparacion {
  id_reparacion?: number;
  id_bicicleta: number;
  descripcion_falla: string;
  costo_estimado: number;
  // RF15 exige un dropdown estricto con estos estados exactos:
  estado: 'Recibida' | 'En reparación' | 'Lista' | 'Entregada';
  fecha_ingreso: string;
}

export interface Producto {
  id_producto?: number;
  nombre: string;
  categoria: 'Repuesto' | 'Accesorio' | 'Componente';
  precio_venta: number;
  cantidad: number;
  stock_minimo: number; // Campo clave para el RF22
}
export interface Venta {
  id_venta?: number;
  id_cliente: number;
  fecha: string;
  total: number;
  tipo_pago: string; // <-- Asegúrate de que se llame exactamente así
}