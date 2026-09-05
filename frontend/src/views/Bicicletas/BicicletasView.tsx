import { useBicicletas } from './hooks/useBicicletas';
import { BicicletasHeader } from './components/BicicletasHeader';
import { BicicletasTabla } from './components/BicicletasTabla';
import { ModalAltaBicicleta } from './components/ModalAltaBicicleta';
import { ModalEditarBicicleta } from './components/ModalEditarBicicleta';
import { ModalHistorialBicicleta } from './components/ModalHistorialBicicleta';

export function BicicletasView() {
  const {
    bicicletas,
    clientes,
    bicicletasFiltradas,
    totalBicicletas,
    cargando,
    guardando,
    error,
    busqueda,
    mostrarModal,
    nuevaBici,
    mostrarModalEditar,
    biciAEditar,
    mostrarModalHistorial,
    cargandoHistorial,
    datosHistorial,
    setBusqueda,
    setMostrarModal,
    setNuevaBici,
    setMostrarModalEditar,
    setBiciAEditar,
    setMostrarModalHistorial,
    handleGuardarBici,
    handleAbrirEditar,
    handleGuardarEdicion,
    handleVerHistorial,
    handleEliminarBici
  } = useBicicletas();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER SUPERIOR Y BUSCADOR */}
      <BicicletasHeader
        totalBicicletas={totalBicicletas}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        onAbrirNuevo={() => setMostrarModal(true)}
      />

      {/* ERROR BANNER */}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* TABLA DE BICICLETAS */}
      <BicicletasTabla
        bicicletas={bicicletas}
        bicicletasFiltradas={bicicletasFiltradas}
        cargando={cargando}
        onVerHistorial={handleVerHistorial}
        onEditar={handleAbrirEditar}
        onEliminar={handleEliminarBici}
      />

      {/* MODAL 1: REGISTRAR BICICLETA NUEVA */}
      <ModalAltaBicicleta
        mostrar={mostrarModal}
        onCerrar={() => setMostrarModal(false)}
        nuevaBici={nuevaBici}
        setNuevaBici={setNuevaBici}
        clientes={clientes}
        guardando={guardando}
        onSubmit={handleGuardarBici}
      />

      {/* MODAL 2: EDITAR BICICLETA (CU07) */}
      <ModalEditarBicicleta
        mostrar={mostrarModalEditar}
        onCerrar={() => {
          setMostrarModalEditar(false);
          setBiciAEditar(null);
        }}
        biciAEditar={biciAEditar}
        setBiciAEditar={setBiciAEditar}
        guardando={guardando}
        onSubmit={handleGuardarEdicion}
      />

      {/* MODAL 3: FICHA TÉCNICA E HISTORIAL DE REPARACIONES (CU08) */}
      <ModalHistorialBicicleta
        mostrar={mostrarModalHistorial}
        onCerrar={() => setMostrarModalHistorial(false)}
        cargandoHistorial={cargandoHistorial}
        datosHistorial={datosHistorial}
      />
    </div>
  );
}
