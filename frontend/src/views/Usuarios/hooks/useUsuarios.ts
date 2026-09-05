import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Usuario, NuevoUsuarioData, EditarUsuarioData, BadgeRolInfo } from '../types';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const INITIAL_NUEVO_USUARIO: NuevoUsuarioData = {
  nombre_usuario: '',
  contrasena: '',
  rol: 'EMPLEADO'
};

const INITIAL_FORM_EDITAR: EditarUsuarioData = {
  rol: 'EMPLEADO',
  contrasena: ''
};

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
  }, [usuarioActual?.id_usuario, cargarUsuarios]);

  const usuariosFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return usuarios;
    return usuarios.filter(u => {
      const nombre = (u.nombre_usuario || '').toLowerCase();
      const rol = (u.rol || '').toLowerCase();
      return nombre.includes(term) || rol.includes(term);
    });
  }, [usuarios, busqueda]);

  const getBadgeRol = useCallback((rol: string): BadgeRolInfo => {
    const rolUpper = (rol || '').toUpperCase();
    if (rolUpper === 'SUPERADMIN') {
      return { bg: 'rgba(168, 85, 247, 0.12)', color: '#9333ea', label: 'SUPERADMIN' };
    }
    if (rolUpper === 'ADMIN') {
      return { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', label: 'ADMIN' };
    }
    return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', label: 'EMPLEADO' };
  }, []);

  return {
    usuarios,
    usuariosFiltrados,
    totalUsuarios: usuarios.length,
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
