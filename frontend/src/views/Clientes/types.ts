import type { Cliente } from '../../types';

export interface ErroresFormulario {
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  email?: string;
}

export type ClienteFormData = Omit<Cliente, 'id_cliente'>;

export type { Cliente };
