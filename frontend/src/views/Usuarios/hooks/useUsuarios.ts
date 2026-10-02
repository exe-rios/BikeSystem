import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Usuario, NuevoUsuarioData, EditarUsuarioData, BadgeRolInfo } from '../types';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserRoleTheme } from '../../../utils/userColors';

const INITIAL_NUEVO_USUARIO: NuevoUsuarioData = {
  nombre_usuario: '',
  contrasena: '',
  rol: 'EMPLEADO'
};

const INITIAL_FORM_EDITAR: EditarUsuarioData = {
  rol: 'EMPLEADO',
  contrasena: ''
};

/** Hook para la gestión de usuarios, asignación de roles y actualización de claves. */
export function useUsuarios() {
  const { user: usuarioActual } = useAuth();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal Crear
  const [mostrarModalCrear, setMostrarModalCrear] = useState<boolean>(false);
  const [nuevoUsuario, setNuevoUsuario] = useState<NuevoUsuarioData>(INITIAL_NUEVO_USUARIO);

  // Modal Editar
  const [mostrarModalEditar, setMostrarModalEditar] = useState<boolean>(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formEditar, setFormEditar] = useState<EditarUsuarioData>(INITIAL_FORM_EDITAR);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.usuarios.getAll();
      setUsuarios(data.usuarios || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al consultar usuarios');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarUsuarios();
  }, [cargarUsuarios]);

  const handleCrearUsuario = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoUsuario.nombre_usuario.trim() || !nuevoUsuario.contrasena.trim()) {
      alert('Por favor completa el nombre de usuario y la contraseña.');
      return;
    }

    if (nuevoUsuario.nombre_usuario.trim().length < 3) {
      alert('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }

    if (nuevoUsuario.contrasena.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres por seguridad.');
      return;
    }

    setGuardando(true);
    try {
      await api.usuarios.create({
        nombre_usuario: nuevoUsuario.nombre_usuario.trim(),
        contrasena: nuevoUsuario.contrasena,
        rol: nuevoUsuario.rol
      });

      alert('Usuario creado con éxito');
      setMostrarModalCrear(false);
      setNuevoUsuario(INITIAL_NUEVO_USUARIO);
      await cargarUsuarios();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al crear usuario: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  }, [nuevoUsuario, cargarUsuarios]);

  const handleAbrirEditar = useCallback((u: Usuario) => {
    setUsuarioEditando(u);
    setFormEditar({ rol: u.rol, contrasena: '' });
    setMostrarModalEditar(true);
  }, []);

  const handleEditarUsuario = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando || !usuarioEditando.id_usuario) return;

    if (formEditar.contrasena && formEditar.contrasena.length < 6) {
      alert('La nueva contraseña debe tener al menos 6 caracteres por seguridad.');
      return;
    }

    setGuardando(true);
    try {
      await api.usuarios.update(usuarioEditando.id_usuario, {
        rol: formEditar.rol,
        contrasena: formEditar.contrasena.trim() || undefined
      });

      alert('Usuario actualizado con éxito.');
      setMostrarModalEditar(false);
      setUsuarioEditando(null);
      await cargarUsuarios();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al actualizar usuario: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  }, [usuarioEditando, formEditar, cargarUsuarios]);

  const handleEliminar = useCallback(async (id: number, nombre: string) => {
    if (id === usuarioActual?.id_usuario) {
      alert('No puedes eliminar tu propia cuenta en uso.');
      return;
    }

    const targetUser = usuarios.find(u => u.id_usuario === id);
    if (targetUser && (targetUser.rol === 'SUPERADMIN' || targetUser.nombre_usuario?.toLowerCase() === 'superadmin')) {
      alert('La cuenta de superadministrador está reservada para mantenimiento y no puede ser eliminada.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${nombre}"?`)) {
      return;
    }

    try {
      await api.usuarios.delete(id);
      alert('Usuario eliminado correctamente.');
      await cargarUsuarios();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`No se pudo eliminar: ${err.message}`);
      }
    }
  }, [usuarioActual?.id_usuario, usuarios, cargarUsuarios]);

  const esSuperAdmin = usuarioActual?.rol === 'SUPERADMIN' || (usuarioActual?.nombre_usuario || '').toLowerCase() === 'superadmin';

  // Ocultar al superadmin si quien está en sesión no es superadmin
  const usuariosPermitidos = useMemo(() => {
    if (esSuperAdmin) return usuarios;
    return usuarios.filter(u => u.rol !== 'SUPERADMIN' && (u.nombre_usuario || '').toLowerCase() !== 'superadmin');
  }, [usuarios, esSuperAdmin]);

  const usuariosFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return usuariosPermitidos;
    return usuariosPermitidos.filter(u => {
      const nombre = (u.nombre_usuario || '').toLowerCase();
      const rol = (u.rol || '').toLowerCase();
      return nombre.includes(term) || rol.includes(term);
    });
  }, [usuariosPermitidos, busqueda]);

  const getBadgeRol = useCallback((rol: string): BadgeRolInfo => {
    const theme = getUserRoleTheme(rol);
    return { bg: theme.badgeBg, color: theme.badgeColor, label: theme.label };
  }, []);

  return {
    usuarios: usuariosPermitidos,
    usuariosFiltrados,
    totalUsuarios: usuariosPermitidos.length,
    usuarioActual,
    cargando,
    guardando,
    error,
    busqueda,
    mostrarModalCrear,
    nuevoUsuario,
    mostrarModalEditar,
    usuarioEditando,
    formEditar,
    setBusqueda,
    setMostrarModalCrear,
    setNuevoUsuario,
    setMostrarModalEditar,
    setFormEditar,
    handleCrearUsuario,
    handleAbrirEditar,
    handleEditarUsuario,
    handleEliminar,
    getBadgeRol,
    recargar: cargarUsuarios
  };
}
