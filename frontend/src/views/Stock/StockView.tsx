import { useState } from 'react';
import { useStock } from './hooks/useStock';
import { useMovimientosStock } from './hooks/useMovimientosStock';
import { StockHeader } from './components/StockHeader';
import { StockFiltros } from './components/StockFiltros';
import { StockTabla } from './components/StockTabla';
import { TabProveedoresCotizaciones } from './components/TabProveedoresCotizaciones';
import { TabPedidosProveedor } from './components/TabPedidosProveedor';
import { ModalProductoForm } from './components/ModalProductoForm';
import { ModalAjusteStock } from './components/ModalAjusteStock';
import { ModalHistorialMovimientos } from './components/ModalHistorialMovimientos';
import { ModalCargaMasivaProductos } from './components/ModalCargaMasivaProductos';
import { ModalAumentoMasivoProveedor } from './components/ModalAumentoMasivoProveedor';
import { ModalAltaPagoProveedor } from '../PagoProveedores/components/ModalAltaPagoProveedor';
import { Paginador } from '../../components/Paginador';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import type { FormProductoData, VistaTabStock } from './types';
import type { MetodoPago } from '../../types';
import type { NuevoPagoData } from '../PagoProveedores/types';

/** Vista principal de gestión de inventario, stock, proveedores, precios USD/ARS y movimientos de almacén. */
export function StockView() {
  const { user } = useAuth();
  const {
    productos,
    productosFiltrados,
    proveedores,
    cotizacionInfo,
    resumen,
    cargando,
    guardando,
    error,
    filtroTipo,
    filtroEstado,
    filtroDisponibilidad,
    filtroProveedor,
    filtroMoneda,
    busqueda,
    paginaActual,
    totalPaginas,
    totalRegistros,
    limite,
    setPaginaActual,
    mostrarModalForm,
    modoModal,
    productoEditando,
    formData,
    errorForm,
    setFiltroTipo,
    setFiltroEstado,
    setFiltroDisponibilidad,
    setFiltroProveedor,
    setFiltroMoneda,
    setBusqueda,
    setFormData,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModalForm,
    guardarProducto,
    eliminarProducto,
    reactivarProducto,
    actualizarCotizacionDolar,
    actualizarCotizacionProveedor,
    recargar
  } = useStock();

  const {
    mostrarModalMovimiento,
    mostrarModalHistorialMov,
    cargandoMovimientos,
    guardandoMovimiento,
    historialMovimientos,
    productosCatalogo,
    nuevoMovimiento,
    errorMovimiento,
    setNuevoMovimiento,
    abrirAjuste,
    cerrarModalAjuste,
    cerrarModalHistorial,
    verHistorialMovimientos,
    guardarMovimiento
  } = useMovimientosStock();

  // Navegación entre Inventario y Proveedores + modales
  const [vistaTab, setVistaTab] = useState<VistaTabStock>('inventario');
  const [mostrarModalCargaMasiva, setMostrarModalCargaMasiva] = useState(false);
  const [mostrarModalAumentoMasivo, setMostrarModalAumentoMasivo] = useState(false);
  const [proveedorObjetivoId, setProveedorObjetivoId] = useState<string>('');
  const [porcentajeInicialAumento, setPorcentajeInicialAumento] = useState<string>('10');

  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [nuevoPago, setNuevoPago] = useState<NuevoPagoData>({
    nombre_proveedor: '',
    id_metodo_pago: 1,
    monto_total: '',
    moneda: 'ARS',
    observaciones: ''
  });

  const abrirModalPagoRapido = async (idProvExplicito?: number) => {
    const idTarget = idProvExplicito !== undefined ? String(idProvExplicito) : String(filtroProveedor);
    const provSeleccionado = proveedores.find(p => String(p.id_proveedor) === idTarget);
    let metodos = metodosPago;
    if (metodos.length === 0) {
      try {
        metodos = await api.pagosProveedores.getMetodosPago();
        setMetodosPago(metodos);
      } catch {
        metodos = [];
      }
    }
    setNuevoPago({
      nombre_proveedor: provSeleccionado?.nombre_empresa || '',
      id_metodo_pago: metodos[0]?.id_metodo_pago || 1,
      monto_total: '',
      moneda: 'ARS',
      observaciones: ''
    });
    setMostrarModalPago(true);
  };

  const handleCrearProveedorRapido = async (datos: {
    nombre_empresa: string;
    cotizacion_dolar?: number | null;
    cuit?: string;
    telefono?: string;
  }) => {
    await api.proveedores.create({
      nombre_empresa: datos.nombre_empresa,
      cotizacion_dolar: datos.cotizacion_dolar ?? null,
      cuit: datos.cuit || '',
      telefono: datos.telefono || '',
      email: '',
      direccion: ''
    });
    await recargar();
  };

  const handleGuardarPagoRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = Math.round(Number(nuevoPago.monto_total) * 100) / 100;
    if (!nuevoPago.nombre_proveedor.trim() || !nuevoPago.id_metodo_pago || isNaN(montoNum) || montoNum <= 0) {
      alert('Completá el proveedor, método de pago y un monto mayor a 0.');
      return;
    }

    const monedaPago = nuevoPago.moneda === 'USD' ? 'USD' : 'ARS';
    const provMatch = proveedores.find(
      p => p.nombre_empresa.trim().toLowerCase() === nuevoPago.nombre_proveedor.trim().toLowerCase()
    );
    const cotEfectiva = provMatch?.cotizacion_dolar && Number(provMatch.cotizacion_dolar) > 0
      ? Number(provMatch.cotizacion_dolar)
      : cotizacionInfo.cotizacion_dolar;
    const montoArsFinal = monedaPago === 'USD'
      ? Math.round(montoNum * cotEfectiva * 100) / 100
      : montoNum;

    setGuardandoPago(true);
    try {
      await api.pagosProveedores.create({
        nombre_proveedor: nuevoPago.nombre_proveedor.trim(),
        id_usuario: user?.id_usuario || 1,
        id_metodo_pago: nuevoPago.id_metodo_pago,
        monto_total: montoArsFinal,
        moneda: monedaPago,
        monto_usd: monedaPago === 'USD' ? montoNum : undefined,
        cotizacion_dolar: monedaPago === 'USD' ? cotEfectiva : undefined,
        observaciones: nuevoPago.observaciones
      });
      alert('Pago al proveedor declarado exitosamente y registrado en Auditoría.');
      setMostrarModalPago(false);
      await recargar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al registrar el pago.');
    } finally {
      setGuardandoPago(false);
    }
  };

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
      {/* 1. Header con Pestañas, KPIs y Acciones */}
      <StockHeader
        resumen={resumen}
        vistaTab={vistaTab}
        proveedoresCount={proveedores.length}
        onCambiarVistaTab={setVistaTab}
        onAbrirCrear={abrirModalCrear}
        onAbrirAjuste={() => abrirAjuste()}
        onAbrirHistorial={() => verHistorialMovimientos()}
        onAbrirCargaMasiva={() => {
          setProveedorObjetivoId(filtroProveedor);
          setMostrarModalCargaMasiva(true);
        }}
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

      {vistaTab === 'inventario' ? (
        <>
          {/* 2. Filtros y Búsqueda */}
          <StockFiltros
            busqueda={busqueda}
            filtroTipo={filtroTipo}
            filtroEstado={filtroEstado}
            filtroDisponibilidad={filtroDisponibilidad}
            filtroProveedor={filtroProveedor}
            filtroMoneda={filtroMoneda}
            proveedores={proveedores}
            totalFiltrados={totalRegistros}
            onCambiarBusqueda={setBusqueda}
            onCambiarFiltroTipo={setFiltroTipo}
            onCambiarFiltroEstado={setFiltroEstado}
            onCambiarFiltroDisponibilidad={setFiltroDisponibilidad}
            onCambiarFiltroProveedor={setFiltroProveedor}
            onCambiarFiltroMoneda={setFiltroMoneda}
            onIrAProveedores={() => setVistaTab('proveedores')}
            onAbrirPagoProveedor={() => abrirModalPagoRapido()}
          />

          {/* 3. Tabla de Artículos */}
          <StockTabla
            productos={productosFiltrados}
            cargando={cargando}
            busqueda={busqueda}
            onEditar={abrirModalEditar}
            onEliminar={handleEliminar}
            onReactivar={handleReactivar}
          />

          {/* Paginación de 10 en 10 */}
          <Paginador
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            totalRegistros={totalRegistros}
            limite={limite}
            onCambiarPagina={setPaginaActual}
          />
        </>
      ) : vistaTab === 'pedidos' ? (
        <TabPedidosProveedor proveedores={proveedores} />
      ) : (
        <TabProveedoresCotizaciones
          proveedores={proveedores}
          cotizacionInfo={cotizacionInfo}
          onGuardarDolarBase={actualizarCotizacionDolar}
          onGuardarDolarProveedor={actualizarCotizacionProveedor}
          onCrearProveedor={handleCrearProveedorRapido}
          onAplicarAumentoDirecto={async (idProv, porcentaje) => {
            const res = await api.productos.aumentoMasivo({
              id_proveedor: idProv,
              tipo_ajuste: 'porcentaje',
              valor: porcentaje,
              solo_activos: true,
              preview: false
            });
            await recargar();
            return res;
          }}
          onAbrirAumento={(idProv, pct) => {
            setProveedorObjetivoId(String(idProv));
            setPorcentajeInicialAumento(pct || '2');
            setMostrarModalAumentoMasivo(true);
          }}
          onAbrirCargaMasiva={(idProv) => {
            setProveedorObjetivoId(String(idProv));
            setMostrarModalCargaMasiva(true);
          }}
          onAbrirPago={(idProv) => abrirModalPagoRapido(idProv)}
          onVerProductos={(idProv) => {
            setFiltroProveedor(String(idProv));
            setVistaTab('inventario');
          }}
        />
      )}

      {/* 4. Modales */}
      <ModalProductoForm
        visible={mostrarModalForm}
        modo={modoModal}
        idProducto={productoEditando?.id_producto}
        formData={formData}
        proveedores={proveedores}
        cotizacionDolar={cotizacionInfo.cotizacion_dolar}
        guardando={guardando}
        error={errorForm}
        onChangeField={handleFormChangeField}
        onSubmit={handleFormSubmit}
        onClose={cerrarModalForm}
      />

      {mostrarModalCargaMasiva && (
        <ModalCargaMasivaProductos
          proveedores={proveedores}
          cotizacionDolar={cotizacionInfo.cotizacion_dolar}
          proveedorInicial={proveedorObjetivoId || filtroProveedor}
          onSuccess={async () => { await recargar(); }}
          onClose={() => setMostrarModalCargaMasiva(false)}
        />
      )}

      {mostrarModalAumentoMasivo && (
        <ModalAumentoMasivoProveedor
          proveedores={proveedores}
          cotizacionDolar={cotizacionInfo.cotizacion_dolar}
          proveedorInicial={proveedorObjetivoId || filtroProveedor}
          valorInicial={porcentajeInicialAumento}
          onSuccess={async () => { await recargar(); }}
          onClose={() => setMostrarModalAumentoMasivo(false)}
        />
      )}

      <ModalAltaPagoProveedor
        mostrar={mostrarModalPago}
        onCerrar={() => setMostrarModalPago(false)}
        nuevoPago={nuevoPago}
        setNuevoPago={setNuevoPago}
        proveedores={proveedores}
        metodosPago={metodosPago}
        cotizacionDolar={cotizacionInfo.cotizacion_dolar}
        guardando={guardandoPago}
        onSubmit={handleGuardarPagoRapido}
      />

      <ModalAjusteStock
        visible={mostrarModalMovimiento}
        productos={productosCatalogo.length > 0 ? productosCatalogo : productos}
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
