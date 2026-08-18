import { useState, useEffect } from 'react';
import type { Usuario } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function UsuariosView() {
  const { user: usuarioActual } = useAuth();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal Crear
  const [mostrarModalCrear, setMostrarModalCrear] = useState<boolean>(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre_usuario: '',
    contrasena: '',
    rol: 'EMPLEADO'
  });

  // Modal Editar
  const [mostrarModalEditar, setMostrarModalEditar] = useState<boolean>(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formEditar, setFormEditar] = useState({
    rol: 'EMPLEADO',
    contrasena: ''
  });

  const cargarUsuarios = async () => {
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
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoUsuario.nombre_usuario.trim() || !nuevoUsuario.contrasena.trim()) {
      alert('Por favor completa el nombre de usuario y la contraseña.');
      return;
    }

    setGuardando(true);
    try {
      await api.usuarios.create({
        nombre_usuario: nuevoUsuario.nombre_usuario.trim(),
        contrasena: nuevoUsuario.contrasena.trim(),
        rol: nuevoUsuario.rol
      });

      alert('¡Usuario creado con éxito!');
      setMostrarModalCrear(false);
      setNuevoUsuario({ nombre_usuario: '', contrasena: '', rol: 'EMPLEADO' });
      await cargarUsuarios();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al crear usuario: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando || !usuarioEditando.id_usuario) return;

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
  };

  const handleEliminar = async (id: number, nombre: string) => {
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
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    const nombre = (u.nombre_usuario || '').toLowerCase();
    const rol = (u.rol || '').toLowerCase();
    return nombre.includes(term) || rol.includes(term);
  });

  const getBadgeRol = (rol: string) => {
    const rolUpper = (rol || '').toUpperCase();
    if (rolUpper === 'SUPERADMIN') {
      return { bg: 'rgba(168, 85, 247, 0.12)', color: '#9333ea', label: 'SUPERADMIN' };
    }
    if (rolUpper === 'ADMIN') {
      return { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', label: 'ADMIN' };
    }
    return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', label: 'EMPLEADO' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>
            Gestión de Empleados y Cuentas
          </h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Administración de permisos, roles y accesos al sistema
          </p>
        </div>

        <button
          onClick={() => {
            setNuevoUsuario({ nombre_usuario: '', contrasena: '', rol: 'EMPLEADO' });
            setMostrarModalCrear(true);
          }}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Nuevo Empleado
        </button>
      </div>

      {/* CONTADOR Y BUSCADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)', padding: '12px 20px', borderRadius: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Usuarios Activos</span>
          <span style={{
            backgroundColor: '#ff9248', color: '#fff', padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
          }}>{usuarios.length}</span>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre de usuario o rol..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', width: '320px', fontSize: '0.9rem'
          }}
        />
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* TABLA DE USUARIOS */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>ID</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Nombre de Usuario</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Rol en el Sistema</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando usuarios...
                </td>
              </tr>
            ) : usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map(u => {
                const badge = getBadgeRol(u.rol);
                const esPropioUsuario = u.id_usuario === usuarioActual?.id_usuario;

                return (
                  <tr key={u.id_usuario} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                    <td style={{ padding: '16px', color: 'var(--texto-mutado)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      #{u.id_usuario}
                    </td>
                    <td style={{ padding: '16px', fontWeight: '700', color: 'var(--texto-principal)', fontSize: '0.95rem' }}>
                      {u.nombre_usuario} {esPropioUsuario && <span style={{ fontSize: '0.75rem', color: 'var(--azul-oscuro)', fontWeight: '600', marginLeft: '6px' }}>(Tú)</span>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        backgroundColor: badge.bg, color: badge.color,
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700'
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setUsuarioEditando(u);
                            setFormEditar({ rol: u.rol, contrasena: '' });
                            setMostrarModalEditar(true);
                          }}
                          style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--azul-oscuro)',
                            border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '6px', padding: '6px 12px',
                            fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={esPropioUsuario}
                          onClick={() => u.id_usuario && handleEliminar(u.id_usuario, u.nombre_usuario)}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '6px 12px',
                            fontSize: '0.8rem', fontWeight: '600', cursor: esPropioUsuario ? 'not-allowed' : 'pointer',
                            opacity: esPropioUsuario ? 0.4 : 1
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL CREAR USUARIO --- */}
      {mostrarModalCrear && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '460px', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Crear Nuevo Empleado</h3>
              <button onClick={() => setMostrarModalCrear(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleCrearUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Nombre de Usuario *</label>
                <input
                  type="text"
                  placeholder="Ej: lucas.mecanico"
                  value={nuevoUsuario.nombre_usuario}
                  onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre_usuario: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Contraseña Inicial *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={nuevoUsuario.contrasena}
                  onChange={e => setNuevoUsuario({ ...nuevoUsuario, contrasena: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Rol / Permisos *</label>
                <select
                  value={nuevoUsuario.rol}
                  onChange={e => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                >
                  <option value="EMPLEADO">EMPLEADO</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMostrarModalCrear(false)} style={{ flex: 1, padding: '11px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ flex: 2, padding: '11px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDITAR USUARIO --- */}
      {mostrarModalEditar && usuarioEditando && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '460px', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                Editar Usuario: {usuarioEditando.nombre_usuario}
              </h3>
              <button onClick={() => setMostrarModalEditar(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleEditarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Rol en el Sistema</label>
                <select
                  value={formEditar.rol}
                  onChange={e => setFormEditar({ ...formEditar, rol: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                >
                  <option value="EMPLEADO">EMPLEADO</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Nueva Contraseña (Opcional)</label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para conservar la actual"
                  value={formEditar.contrasena}
                  onChange={e => setFormEditar({ ...formEditar, contrasena: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMostrarModalEditar(false)} style={{ flex: 1, padding: '11px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ flex: 2, padding: '11px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
