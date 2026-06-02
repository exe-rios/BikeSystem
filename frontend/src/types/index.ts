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