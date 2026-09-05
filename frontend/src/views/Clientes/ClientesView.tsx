import { useClientes } from './hooks/useClientes';
import { ClientesHeader } from './components/ClientesHeader';
import { ClientesTabla } from './components/ClientesTabla';
import { ModalClienteForm } from './components/ModalClienteForm';

export function ClientesView() {
  const {
    clientes,
    clientesFiltrados,
    totalClientes,
    cargando,
    guardando,
    error,
    errorModal,
    busqueda,
    mostrarModal,
    clienteEditando,
    formData,
    erroresForm,
    setBusqueda,
    setFormData,
    abrirModalNuevo,
    abrirModalEditar,
    cerrarModal,
    handleGuardar,
    handleEliminar
  } = useClientes();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* HEADER SUPERIOR Y BUSCADOR */}
      <ClientesHeader
        totalClientes={totalClientes}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        onAbrirNuevo={abrirModalNuevo}
      />

      {/* ERROR BANNER EN PANTALLA */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid #ef4444',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* TABLA DE CLIENTES */}
      <ClientesTabla
        clientes={clientes}
        clientesFiltrados={clientesFiltrados}
        cargando={cargando}
        onEditar={abrirModalEditar}
        onEliminar={handleEliminar}
      />

      {/* MODAL DE REGISTRO / EDICIÓN */}
      <ModalClienteForm
        mostrar={mostrarModal}
        onCerrar={cerrarModal}
        clienteEditando={clienteEditando}
        formData={formData}
        setFormData={setFormData}
        erroresForm={erroresForm}
        errorModal={errorModal}
        guardando={guardando}
        onSubmit={handleGuardar}
      />
    </div>
  );
}
