import { useStock } from './hooks/useStock';
import { useMovimientosStock } from './hooks/useMovimientosStock';
import { StockHeader } from './components/StockHeader';
import { StockFiltros } from './components/StockFiltros';
import { StockTabla } from './components/StockTabla';
import { ModalProductoForm } from './components/ModalProductoForm';
import { ModalAjusteStock } from './components/ModalAjusteStock';
import { ModalHistorialMovimientos } from './components/ModalHistorialMovimientos';
import type { FormProductoData } from './types';

export function StockView() {
  const {
    productos,
    productosFiltrados,
    resumen,
    cargando,
    guardando,
    error,
    filtroTipo,
    filtroEstado,
    filtroDisponibilidad,
    busqueda,
    mostrarModalForm,
    modoModal,
    formData,
    errorForm,
    setFiltroTipo,
    setFiltroEstado,
    setFiltroDisponibilidad,
    setBusqueda,
    setFormData,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModalForm,
    guardarProducto,
    eliminarProducto,
    reactivarProducto,
    recargar
  } = useStock();

  const {
    mostrarModalMovimiento,
    mostrarModalHistorialMov,
    cargandoMovimientos,
    guardandoMovimiento,
    historialMovimientos,
    nuevoMovimiento,
    errorMovimiento,
    setNuevoMovimiento,
    abrirAjuste,
    cerrarModalAjuste,
    cerrarModalHistorial,
    verHistorialMovimientos,
    guardarMovimiento
  } = useMovimientosStock();

  const handleFormChangeField = <K extends keyof FormProductoData>(field: K, value: FormProductoData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await guardarProducto();
  };

  const handleMovimientoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await guardarMovimiento(async () => {
      await recargar();
    });
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (window.confirm(`¿Seguro que deseas dar de baja "${nombre}" del catálogo activo?\n\nEl producto ya no estará disponible para nuevas ventas o reparaciones, pero se preservarán todos sus registros históricos.`)) {
      await eliminarProducto(id);
    }
  };

  const handleReactivar = async (id: number, nombre: string) => {
    if (window.confirm(`¿Deseas reactivar "${nombre}" en el catálogo activo?`)) {
      await reactivarProducto(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header con KPIs y Acciones */}
      <StockHeader
        resumen={resumen}
        onAbrirCrear={abrirModalCrear}
        onAbrirAjuste={() => abrirAjuste()}
        onAbrirHistorial={() => verHistorialMovimientos()}
      />

      {/* Alerta de Error General si ocurre */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.88rem'
        }}>
          {error}
        </div>
      )}

      {/* 2. Filtros y Búsqueda */}
      <StockFiltros
        busqueda={busqueda}
        filtroTipo={filtroTipo}
        filtroEstado={filtroEstado}
        filtroDisponibilidad={filtroDisponibilidad}
        totalFiltrados={productosFiltrados.length}
        onCambiarBusqueda={setBusqueda}
        onCambiarFiltroTipo={setFiltroTipo}
        onCambiarFiltroEstado={setFiltroEstado}
        onCambiarFiltroDisponibilidad={setFiltroDisponibilidad}
      />

      {/* 3. Tabla de Artículos */}
      <StockTabla
        productos={productosFiltrados}
        cargando={cargando}
        onEditar={abrirModalEditar}
        onEliminar={handleEliminar}
        onReactivar={handleReactivar}
      />

      {/* 4. Modales */}
      <ModalProductoForm
        visible={mostrarModalForm}
        modo={modoModal}
        formData={formData}
        guardando={guardando}
        error={errorForm}
        onChangeField={handleFormChangeField}
        onSubmit={handleFormSubmit}
        onClose={cerrarModalForm}
      />

      <ModalAjusteStock
        visible={mostrarModalMovimiento}
        productos={productos}
        nuevoMovimiento={nuevoMovimiento}
        guardando={guardandoMovimiento}
        error={errorMovimiento}
        onChangeMovimiento={setNuevoMovimiento}
        onSubmit={handleMovimientoSubmit}
        onClose={cerrarModalAjuste}
      />

      <ModalHistorialMovimientos
        visible={mostrarModalHistorialMov}
        movimientos={historialMovimientos}
        cargando={cargandoMovimientos}
        onClose={cerrarModalHistorial}
      />
    </div>
  );
}
