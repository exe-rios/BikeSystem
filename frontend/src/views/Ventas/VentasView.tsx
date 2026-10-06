import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useVentas } from './hooks/useVentas';
import { useCarritoVenta } from './hooks/useCarritoVenta';
import { VentasHeader } from './components/VentasHeader';
import { TabVentasListado } from './tabs/TabVentasListado';
import { TabGarantiasListado } from './tabs/TabGarantiasListado';
import { ModalNuevaVenta } from './components/ModalNuevaVenta';
import { ModalDetalleVenta } from './components/ModalDetalleVenta';
import { ModalRegistroPrimerService } from './components/ModalRegistroPrimerService';
import type { GarantiaConEstado } from './types';

/** Vista principal de facturación, punto de venta (POS) y gestión de garantías. */
export function VentasView() {
  const { user } = useAuth();

  const {
    tabActiva,
    setTabActiva,
    ventas,
    totalVentas,
    paginaVentas,
    totalPaginasVentas,
    limiteVentas,
    setPaginaVentas,
    garantias,
    countTotalGarantias,
    countVigentes,
    countServicePendiente,
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
    registrarPrimerService,
    recargar
  } = useVentas();

  const {
    clienteSeleccionadoId,
    setClienteSeleccionadoId,
    metodoPagoSeleccionadoId,
    setMetodoPagoSeleccionadoId,
    nombreConsumidorFinal,
    setNombreConsumidorFinal,
    apellidoConsumidorFinal,
    setApellidoConsumidorFinal,
    dniConsumidorFinal,
    setDniConsumidorFinal,
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
    errorCarrito,
    setErrorCarrito,
    quitarDelCarrito,
    limpiarCarrito
  } = useCarritoVenta();

  const [garantiaParaService, setGarantiaParaService] = useState<GarantiaConEstado | null>(null);
  const [mostrarModalPrimerService, setMostrarModalPrimerService] = useState<boolean>(false);

  const handleAbrirModalPrimerService = (g: GarantiaConEstado) => {
    setGarantiaParaService(g);
    setMostrarModalPrimerService(true);
  };

  const clienteConsumidorFinal = useMemo(() => {
    return clientes.find(c => 
      (c.nombre?.toLowerCase().trim() === 'consumidor' && c.apellido?.toLowerCase().trim() === 'final') ||
      (c.nombre?.toLowerCase().trim() === 'final' && c.apellido?.toLowerCase().trim() === 'consumidor') ||
      c.direccion?.toLowerCase().includes('mostrador')
    );
  }, [clientes]);

  const handleAbrirNuevaVenta = () => {
    const defaultClienteId = clienteConsumidorFinal?.id_cliente || clientes[0]?.id_cliente || 0;
    limpiarCarrito(metodosPago[0]?.id_metodo_pago || 1, defaultClienteId);
    recargar();
    setMostrarModalNuevaVenta(true);
  };

  const handleFinalizarVentaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clienteIdFinal = (clienteSeleccionadoId && clienteSeleccionadoId > 0)
      ? clienteSeleccionadoId
      : (clienteConsumidorFinal?.id_cliente || 0);

    if (!clienteIdFinal || clienteIdFinal <= 0) {
      setErrorCarrito('Seleccioná un cliente comprador primero.');
      return;
    }

    if (!metodoPagoSeleccionadoId || metodoPagoSeleccionadoId <= 0) {
      setErrorCarrito('Seleccioná el método de pago.');
      return;
    }

    if (carritoDetalle.length === 0) {
      setErrorCarrito('Agregá al menos un artículo a la venta.');
      return;
    }

    const itemsPayload = carritoDetalle.map(item => ({
      id_producto: item.id_producto,
      cantidad: item.cantidad
    }));

    const esCF = clienteIdFinal === clienteConsumidorFinal?.id_cliente;
    const datosCF = esCF ? {
      cliente_nombre: nombreConsumidorFinal.trim() || undefined,
      cliente_apellido: apellidoConsumidorFinal.trim() || undefined,
      cliente_dni: dniConsumidorFinal.trim() || undefined
    } : undefined;

    const exito = await finalizarVenta(clienteIdFinal, metodoPagoSeleccionadoId, itemsPayload, datosCF);
    if (exito) {
      limpiarCarrito(metodosPago[0]?.id_metodo_pago || 1, clienteConsumidorFinal?.id_cliente || 0);
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
          paginaActual={paginaVentas}
          totalPaginas={totalPaginasVentas}
          limite={limiteVentas}
          onCambiarBusqueda={setBusquedaVenta}
          onCambiarPagina={setPaginaVentas}
          onVerDetalle={handleVerDetalleVenta}
        />
      )}

      {/* 3. Pestaña 2: Garantías de Bicicletas */}
      {tabActiva === 'garantias' && (
        <TabGarantiasListado
          garantias={garantias}
          countTotalGarantias={countTotalGarantias}
          countVigentes={countVigentes}
          countServicePendiente={countServicePendiente}
          countPorVencer={countPorVencer}
          countVencidas={countVencidas}
          cargando={cargando}
          busquedaGarantia={busquedaGarantia}
          filtroGarantia={filtroGarantia}
          rolUsuario={user?.rol}
          onCambiarBusqueda={setBusquedaGarantia}
          onCambiarFiltro={setFiltroGarantia}
          onVerDetalle={handleVerDetalleVenta}
          onRegistrarService={handleAbrirModalPrimerService}
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
          errorCarrito={errorCarrito}
          nombreConsumidorFinal={nombreConsumidorFinal}
          apellidoConsumidorFinal={apellidoConsumidorFinal}
          dniConsumidorFinal={dniConsumidorFinal}
          onCambiarNombreCF={setNombreConsumidorFinal}
          onCambiarApellidoCF={setApellidoConsumidorFinal}
          onCambiarDniCF={setDniConsumidorFinal}
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

      {/* 6. Modal de Registro de 1° Service Obligatorio */}
      {mostrarModalPrimerService && garantiaParaService && (
        <ModalRegistroPrimerService
          garantia={garantiaParaService}
          abierto={mostrarModalPrimerService}
          rolUsuario={user?.rol}
          onClose={() => {
            setMostrarModalPrimerService(false);
            setGarantiaParaService(null);
          }}
          onConfirmar={registrarPrimerService}
        />
      )}

    </div>
  );
}
