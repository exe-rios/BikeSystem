import type { BitacoraActividad } from '../../types';

export type ModuloFiltro = 'todos' | 'Ventas' | 'Stock' | 'Taller' | 'Usuarios' | 'Clientes' | string;

export interface BadgeModuloStyle {
  bg: string;
  color: string;
  border: string;
}

export type { BitacoraActividad };
