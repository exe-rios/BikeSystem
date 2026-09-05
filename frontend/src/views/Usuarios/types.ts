import type { Usuario } from '../../types';

export type RolUsuario = 'EMPLEADO' | 'ADMIN' | 'SUPERADMIN';

export interface NuevoUsuarioData {
  nombre_usuario: string;
  contrasena: string;
  rol: RolUsuario | string;
}

export interface EditarUsuarioData {
  rol: RolUsuario | string;
  contrasena: string;
}

export interface BadgeRolInfo {
  bg: string;
  color: string;
  label: string;
}

export type { Usuario };
