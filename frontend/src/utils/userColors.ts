/**
 * Utilidad de colores y estilos temáticos por rol de usuario para BikeSystem.
 * Requerimiento:
 * - ADMIN: Color Azul (#2563eb)
 * - EMPLEADO: Color Verde (#10b981 / #059669)
 * - SUPERADMIN: Color Púrpura / Violeta (#7c3aed) con distintivo de desarrollador
 */

export interface UserRoleTheme {
  primary: string;
  avatarBg: string;
  avatarText: string;
  avatarBorder: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  label: string;
  roleName: string;
  isSuperAdmin: boolean;
}

export function getUserRoleTheme(rol?: string, nombre_usuario?: string): UserRoleTheme {
  const rolUpper = (rol || '').toUpperCase();
  const esSuperAdmin = rolUpper === 'SUPERADMIN' || (nombre_usuario || '').toLowerCase() === 'superadmin';

  if (esSuperAdmin) {
    return {
      primary: '#7c3aed',
      avatarBg: '#7c3aed',
      avatarText: '#ffffff',
      avatarBorder: '#6d28d9',
      badgeBg: 'rgba(124, 58, 237, 0.12)',
      badgeColor: '#7c3aed',
      badgeBorder: 'rgba(124, 58, 237, 0.3)',
      label: 'SUPERADMIN',
      roleName: 'SUPERADMIN',
      isSuperAdmin: true,
    };
  }

  if (rolUpper === 'ADMIN') {
    return {
      primary: '#2563eb', // AZUL para Administrador
      avatarBg: '#2563eb',
      avatarText: '#ffffff',
      avatarBorder: '#1d4ed8',
      badgeBg: 'rgba(37, 99, 235, 0.12)',
      badgeColor: '#2563eb',
      badgeBorder: 'rgba(37, 99, 235, 0.3)',
      label: 'ADMIN',
      roleName: 'ADMIN',
      isSuperAdmin: false,
    };
  }

  // EMPLEADO (Default: VERDE)
  return {
    primary: '#10b981', // VERDE para Empleado
    avatarBg: '#10b981',
    avatarText: '#ffffff',
    avatarBorder: '#059669',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeColor: '#059669',
    badgeBorder: 'rgba(16, 185, 129, 0.3)',
    label: 'EMPLEADO',
    roleName: 'EMPLEADO',
    isSuperAdmin: false,
  };
}
