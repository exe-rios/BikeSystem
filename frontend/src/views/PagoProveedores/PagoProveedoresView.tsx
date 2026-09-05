import { usePagoProveedores } from './hooks/usePagoProveedores';
import { PagoProveedoresHeader } from './components/PagoProveedoresHeader';
import { PagoProveedoresTabla } from './components/PagoProveedoresTabla';
import { ModalAltaPagoProveedor } from './components/ModalAltaPagoProveedor';

export function PagoProveedoresView() {
  const {
    pagos,
    pagosFiltrados,
    totalPagos,
    proveedores,
    metodosPago,
    cargando,
    guardando,
    error,
    busqueda,
    mostrarModal,
    nuevoPago,
    setBusqueda,
    setMostrarModal,
    setNuevoPago,
    handleGuardar
  } = usePagoProveedores();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* HEADER SUPERIOR Y BUSCADOR */}
      <PagoProveedoresHeader
        totalPagos={totalPagos}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        onAbrirNuevo={() => {
          setNuevoPago({
            nombre_proveedor: '',
            id_metodo_pago: metodosPago[0]?.id_metodo_pago || 1,
            monto_total: '',
            observaciones: ''
          });
          setMostrarModal(true);
        }}
      />

      {/* ERROR */}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* TABLA DE PAGOS */}
      <PagoProveedoresTabla
        pagos={pagos}
        pagosFiltrados={pagosFiltrados}
        cargando={cargando}
      />

      {/* MODAL DE REGISTRO */}
      <ModalAltaPagoProveedor
        mostrar={mostrarModal}
        onCerrar={() => setMostrarModal(false)}
        nuevoPago={nuevoPago}
        setNuevoPago={setNuevoPago}
        proveedores={proveedores}
        metodosPago={metodosPago}
        guardando={guardando}
        onSubmit={handleGuardar}
      />
    </div>
  );
}

// Alias de exportación para compatibilidad
export { PagoProveedoresView as PagoProveedores };
