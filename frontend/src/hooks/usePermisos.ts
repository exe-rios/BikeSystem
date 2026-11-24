import { useAuth } from '../contexts/AuthContext';

export interface PermisosUsuario {
  esAdmin: boolean;
  esSuperadmin: boolean;
  puedeGestionarCatalogo: boolean;
  puedeCrearProducto: boolean;
  puedeEditarProducto: boolean;
  puedeEliminarProducto: boolean;
  puedeEliminarClientes: boolean;
  puedeEliminarBicicletas: boolean;
  puedeAjustarStock: boolean;
  puedeConfigurarDolar: boolean;
  puedeCargaMasiva: boolean;
  puedeAumentoMasivo: boolean;
  puedeVerReportes: boolean;
  puedeVerAuditoria: boolean;
  puedeVerLogsSistema: boolean;
  puedeGestionarUsuarios: boolean;
  puedeGestionarProveedores: boolean;
  rol: string;
}

/** Hook para computar capacidades y permisos de acceso del usuario actual según su rol. */
export function usePermisos(): PermisosUsuario {
  const { user } = useAuth();
  const rol = (user?.rol || 'EMPLEADO').toUpperCase();
  const esSuperadmin = rol === 'SUPERADMIN';
  const esAdmin = rol === 'ADMIN' || esSuperadmin;

  return {
    esAdmin,
    esSuperadmin,
    puedeGestionarCatalogo: true, // Habilitado para empleados y administradores
    puedeCrearProducto: true,     // Empleados y administradores pueden cargar productos
    puedeEditarProducto: true,    // Empleados y administradores pueden editar productos
    puedeEliminarProducto: esAdmin, // Solo administradores pueden dar de baja productos
    puedeEliminarClientes: esAdmin,
    puedeEliminarBicicletas: esAdmin,
    puedeAjustarStock: true, // Permitido a empleados y administradores según backend
    puedeConfigurarDolar: esAdmin, // Solo ADMIN y SUPERADMIN pueden ingresar la cotización
    puedeCargaMasiva: esAdmin,     // Solo ADMIN y SUPERADMIN pueden hacer carga masiva
    puedeAumentoMasivo: esAdmin,   // Solo ADMIN y SUPERADMIN pueden aumentar precios por proveedor
    puedeVerReportes: esAdmin,
    puedeVerAuditoria: esAdmin,
    puedeVerLogsSistema: esSuperadmin,
    puedeGestionarUsuarios: esAdmin,
    puedeGestionarProveedores: esAdmin,
    rol
  };
}
