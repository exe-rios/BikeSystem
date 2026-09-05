import { useUsuarios } from './hooks/useUsuarios';
import { UsuariosHeader } from './components/UsuariosHeader';
import { UsuariosTabla } from './components/UsuariosTabla';
import { ModalAltaUsuario } from './components/ModalAltaUsuario';
import { ModalEditarUsuario } from './components/ModalEditarUsuario';

export function UsuariosView() {
  const {
    usuarios,
    usuariosFiltrados,
    totalUsuarios,
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
    getBadgeRol
  } = useUsuarios();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER SUPERIOR Y BUSCADOR */}
      <UsuariosHeader
        totalUsuarios={totalUsuarios}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        onAbrirNuevo={() => {
          setNuevoUsuario({ nombre_usuario: '', contrasena: '', rol: 'EMPLEADO' });
          setMostrarModalCrear(true);
        }}
      />

      {/* ERROR BANNER */}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* TABLA DE USUARIOS */}
      <UsuariosTabla
        usuarios={usuarios}
        usuariosFiltrados={usuariosFiltrados}
        cargando={cargando}
        usuarioActualId={usuarioActual?.id_usuario}
        getBadgeRol={getBadgeRol}
        onEditar={handleAbrirEditar}
        onEliminar={handleEliminar}
      />

      {/* MODAL CREAR USUARIO */}
      <ModalAltaUsuario
        mostrar={mostrarModalCrear}
        onCerrar={() => setMostrarModalCrear(false)}
        nuevoUsuario={nuevoUsuario}
        setNuevoUsuario={setNuevoUsuario}
        guardando={guardando}
        onSubmit={handleCrearUsuario}
      />

      {/* MODAL EDITAR USUARIO */}
      <ModalEditarUsuario
        mostrar={mostrarModalEditar}
        onCerrar={() => {
          setMostrarModalEditar(false);
          setFormEditar({ rol: 'EMPLEADO', contrasena: '' });
        }}
        usuarioEditando={usuarioEditando}
        formEditar={formEditar}
        setFormEditar={setFormEditar}
        guardando={guardando}
        onSubmit={handleEditarUsuario}
      />
    </div>
  );
}
