import { useReparaciones, COLUMNAS_KANBAN } from './hooks/useReparaciones';
import { ReparacionesHeader } from './components/ReparacionesHeader';
import { ReparacionesKanban } from './components/ReparacionesKanban';
import { ReparacionesHistorialTabla } from './components/ReparacionesHistorialTabla';
import { ModalAltaReparacion } from './components/ModalAltaReparacion';
import { ModalEditarReparacion } from './components/ModalEditarReparacion';
import { ModalDetalleReparacion } from './components/ModalDetalleReparacion';

export function ReparacionesView() {
  const {
    bicicletas,
    cargando,
    guardando,
    error,
    vistaTab,
    busquedaTaller,
    busquedaHistorial,
    mostrarModalAlta,
    nuevaReparacion,
    ordenEditando,
    mostrarModalEditar,
    mostrarModalDetalle,
    ordenDetalle,
    repuestosUtilizados,
    cargandoRepuestos,
    repuestoSeleccionadoId,
    cantidadRepuesto,
    guardandoRepuesto,
    draggingId,
    reparacionesActivas,
    reparacionesEntregadas,
    reparacionesActivasFiltradas,
    reparacionesEntregadasFiltradas,
    totalMontoHistorico,
    promedioPorOrden,
    repuestosDisponibles,
    productoRepuestoSeleccionado,
    totalRepuestosCosto,
    setVistaTab,
    setBusquedaTaller,
    setBusquedaHistorial,
    setMostrarModalAlta,
    setNuevaReparacion,
    setOrdenEditando,
    setMostrarModalEditar,
    setMostrarModalDetalle,
    setRepuestoSeleccionadoId,
    setCantidadRepuesto,
    setDraggingId,
    handleGuardarReparacion,
    handleAbrirDetalle,
    handleAgregarRepuesto,
    handleEliminarRepuesto,
    handleGuardarEdicion,
    handleCambiarEstado,
    handleEntregarOrden,
    handleReabrirOrden,
    handleDropEnColumna
  } = useReparaciones();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Tabs */}
      <ReparacionesHeader
        vistaTab={vistaTab}
        setVistaTab={setVistaTab}
        activasCount={reparacionesActivas.length}
        entregadasCount={reparacionesEntregadas.length}
        onAbrirAlta={() => {
          setNuevaReparacion({ id_bicicleta: 0, descripcion: '', costo_mano_obra: '', estado: 'Recibida' });
          setMostrarModalAlta(true);
        }}
      />

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Vista 1: Tablero Kanban de Taller Activo */}
      {vistaTab === 'activo' && (
        <ReparacionesKanban
          columnas={COLUMNAS_KANBAN}
          reparacionesActivas={reparacionesActivas}
          reparacionesActivasFiltradas={reparacionesActivasFiltradas}
          busquedaTaller={busquedaTaller}
          setBusquedaTaller={setBusquedaTaller}
          cargando={cargando}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          handleDropEnColumna={handleDropEnColumna}
          handleAbrirDetalle={handleAbrirDetalle}
          setOrdenEditando={setOrdenEditando}
          setMostrarModalEditar={setMostrarModalEditar}
          handleCambiarEstado={handleCambiarEstado}
          handleEntregarOrden={handleEntregarOrden}
        />
      )}

      {/* Vista 2: Historial de Entregas */}
      {vistaTab === 'historial' && (
        <ReparacionesHistorialTabla
          reparacionesEntregadas={reparacionesEntregadas}
          reparacionesEntregadasFiltradas={reparacionesEntregadasFiltradas}
          totalMontoHistorico={totalMontoHistorico}
          promedioPorOrden={promedioPorOrden}
          busquedaHistorial={busquedaHistorial}
          setBusquedaHistorial={setBusquedaHistorial}
          cargando={cargando}
          handleAbrirDetalle={handleAbrirDetalle}
          setOrdenEditando={setOrdenEditando}
          setMostrarModalEditar={setMostrarModalEditar}
          handleReabrirOrden={handleReabrirOrden}
        />
      )}

      {/* Modal Alta */}
      <ModalAltaReparacion
        mostrar={mostrarModalAlta}
        onCerrar={() => setMostrarModalAlta(false)}
        nuevaReparacion={nuevaReparacion}
        setNuevaReparacion={setNuevaReparacion}
        bicicletas={bicicletas}
        guardando={guardando}
        onSubmit={handleGuardarReparacion}
      />

      {/* Modal Editar */}
      <ModalEditarReparacion
        mostrar={mostrarModalEditar}
        onCerrar={() => {
          setMostrarModalEditar(false);
          setOrdenEditando(null);
        }}
        ordenEditando={ordenEditando}
        setOrdenEditando={setOrdenEditando}
        guardando={guardando}
        onSubmit={handleGuardarEdicion}
      />

      {/* Modal Detalle & Repuestos */}
      <ModalDetalleReparacion
        mostrar={mostrarModalDetalle}
        onCerrar={() => setMostrarModalDetalle(false)}
        ordenDetalle={ordenDetalle}
        repuestosUtilizados={repuestosUtilizados}
        cargandoRepuestos={cargandoRepuestos}
        repuestosDisponibles={repuestosDisponibles}
        repuestoSeleccionadoId={repuestoSeleccionadoId}
        setRepuestoSeleccionadoId={setRepuestoSeleccionadoId}
        cantidadRepuesto={cantidadRepuesto}
        setCantidadRepuesto={setCantidadRepuesto}
        productoRepuestoSeleccionado={productoRepuestoSeleccionado}
        guardandoRepuesto={guardandoRepuesto}
        totalRepuestosCosto={totalRepuestosCosto}
        onAgregarRepuesto={handleAgregarRepuesto}
        onEliminarRepuesto={handleEliminarRepuesto}
      />
    </div>
  );
}
