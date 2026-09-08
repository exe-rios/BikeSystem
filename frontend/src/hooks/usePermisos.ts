import { useAuth } from '../contexts/AuthContext';

export interface PermisosUsuario {
  esAdmin: boolean;
  puedeGestionarCatalogo: boolean;
  puedeEliminarClientes: boolean;
  puedeEliminarBicicletas: boolean;
  puedeAjustarStock: boolean;
  puedeVerReportes: boolean;
  puedeVerAuditoria: boolean;
  puedeGestionarUsuarios: boolean;
  puedeGestionarProveedores: boolean;
  rol: string;
}

/** Hook para computar capacidades y permisos de acceso del usuario actual según su rol. */
export function usePermisos(): PermisosUsuario {
  const { user } = useAuth();
  const rol = (user?.rol || 'EMPLEADO').toUpperCase();
  const esAdmin = rol === 'ADMIN' || rol === 'SUPERADMIN';

  return {
    esAdmin,
    puedeGestionarCatalogo: esAdmin,
    puedeEliminarClientes: esAdmin,
    puedeEliminarBicicletas: esAdmin,
    puedeAjustarStock: true, // Permitido a empleados y administradores según backend
    puedeVerReportes: esAdmin,
    puedeVerAuditoria: esAdmin,
    puedeGestionarUsuarios: esAdmin,
    puedeGestionarProveedores: esAdmin,
    rol
  };
}
