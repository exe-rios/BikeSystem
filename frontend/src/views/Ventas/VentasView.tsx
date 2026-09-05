import { useVentas } from './hooks/useVentas';
import { useCarritoVenta } from './hooks/useCarritoVenta';
import { VentasHeader } from './components/VentasHeader';
import { TabVentasListado } from './tabs/TabVentasListado';
import { TabGarantiasListado } from './tabs/TabGarantiasListado';
import { ModalNuevaVenta } from './components/ModalNuevaVenta';
import { ModalDetalleVenta } from './components/ModalDetalleVenta';

export function VentasView() {
  const {
    tabActiva,
    setTabActiva,
    ventas,
    totalVentas,
    garantias,
    countTotalGarantias,
    countVigentes,
    countPorVencer,
    countVencidas,
    clientes,
    productos,
    metodosPago,
    cargando,
    guardando,
    anulando,
    error,
    busquedaVenta,
    setBusquedaVenta,
    busquedaGarantia,
    setBusquedaGarantia,
    filtroGarantia,
    setFiltroGarantia,
    mostrarModalNuevaVenta,
    setMostrarModalNuevaVenta,
    mostrarModalDetalle,
    setMostrarModalDetalle,
    cargandoDetalle,
    ventaSeleccionada,
    handleVerDetalleVenta,
    handleAnularVenta,
    finalizarVenta,
    recargar
  } = useVentas();

  const {
    clienteSeleccionadoId,
    setClienteSeleccionadoId,
    metodoPagoSeleccionadoId,
    setMetodoPagoSeleccionadoId,
    carritoDetalle,
    productoBuscadoId,
    setProductoBuscadoId,
    cantidadAnadir,
    setCantidadAnadir,
    filtroTipo,
    setFiltroTipo,
    totalVenta,
    agregarAlCarrito,
    actualizarCantidadItem,
    quitarDelCarrito,
    limpiarCarrito
  } = useCarritoVenta();

  const handleAbrirNuevaVenta = () => {
    limpiarCarrito(metodosPago[0]?.id_metodo_pago || 1);
    recargar();
    setMostrarModalNuevaVenta(true);
  };

  const handleFinalizarVentaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteSeleccionadoId || clienteSeleccionadoId <= 0) {
      alert('Seleccioná un cliente primero.');
      return;
    }

    if (!metodoPagoSeleccionadoId || metodoPagoSeleccionadoId <= 0) {
      alert('Seleccioná el método de pago.');
      return;
    }

    if (carritoDetalle.length === 0) {
      alert('Agregá al menos un artículo a la venta.');
      return;
    }

    const itemsPayload = carritoDetalle.map(item => ({
      id_producto: item.id_producto,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario
    }));

    const exito = await finalizarVenta(clienteSeleccionadoId, metodoPagoSeleccionadoId, itemsPayload);
    if (exito) {
      limpiarCarrito(metodosPago[0]?.id_metodo_pago || 1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%' }}>

      {/* 1. Header y Pestañas */}
      <VentasHeader
        tabActiva={tabActiva}
        totalVentas={totalVentas}
        totalGarantias={countTotalGarantias}
        countPorVencer={countPorVencer}
        onTabChange={setTabActiva}
        onNuevaVenta={handleAbrirNuevaVenta}
      />

      {/* Mensaje de Error si ocurre */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444',
          color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* 2. Pestaña 1: Ventas de Mostrador */}
      {tabActiva === 'ventas' && (
        <TabVentasListado
          ventas={ventas}
          totalVentas={totalVentas}
          cargando={cargando}
          busquedaVenta={busquedaVenta}
          onCambiarBusqueda={setBusquedaVenta}
          onVerDetalle={handleVerDetalleVenta}
        />
      )}

      {/* 3. Pestaña 2: Garantías de Bicicletas */}
      {tabActiva === 'garantias' && (
        <TabGarantiasListado
          garantias={garantias}
          countTotalGarantias={countTotalGarantias}
          countVigentes={countVigentes}
          countPorVencer={countPorVencer}
          countVencidas={countVencidas}
          cargando={cargando}
          busquedaGarantia={busquedaGarantia}
          filtroGarantia={filtroGarantia}
          onCambiarBusqueda={setBusquedaGarantia}
          onCambiarFiltro={setFiltroGarantia}
          onVerDetalle={handleVerDetalleVenta}
        />
      )}

      {/* 4. Modal de Punto de Venta (POS) */}
      {mostrarModalNuevaVenta && (
        <ModalNuevaVenta
          clientes={clientes}
          productos={productos}
          metodosPago={metodosPago}
          clienteSeleccionadoId={clienteSeleccionadoId}
          metodoPagoSeleccionadoId={metodoPagoSeleccionadoId}
          productoBuscadoId={productoBuscadoId}
          cantidadAnadir={cantidadAnadir}
          filtroTipo={filtroTipo}
          carritoDetalle={carritoDetalle}
          totalVenta={totalVenta}
          guardando={guardando}
          onCambiarCliente={setClienteSeleccionadoId}
          onCambiarMetodoPago={setMetodoPagoSeleccionadoId}
          onCambiarProductoBuscado={setProductoBuscadoId}
          onCambiarCantidad={setCantidadAnadir}
          onCambiarFiltroTipo={setFiltroTipo}
          onAgregarItem={() => agregarAlCarrito(productos)}
          onActualizarCantidadItem={(id, cant) => actualizarCantidadItem(id, cant, productos)}
          onQuitarItem={quitarDelCarrito}
          onSubmit={handleFinalizarVentaSubmit}
          onClose={() => setMostrarModalNuevaVenta(false)}
        />
      )}

      {/* 5. Modal de Detalle / Factura Imprimible */}
      {mostrarModalDetalle && (
        <ModalDetalleVenta
          ventaSeleccionada={ventaSeleccionada}
          cargandoDetalle={cargandoDetalle}
          anulando={anulando}
          onAnularVenta={handleAnularVenta}
          onClose={() => setMostrarModalDetalle(false)}
        />
      )}

    </div>
  );
}
