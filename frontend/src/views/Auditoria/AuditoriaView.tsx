import { useAuditoria } from './hooks/useAuditoria';
import { AuditoriaHeader } from './components/AuditoriaHeader';
import { AuditoriaFiltros } from './components/AuditoriaFiltros';
import { AuditoriaTabla } from './components/AuditoriaTabla';

/** Vista principal de auditoría y bitácora del sistema. */
export function AuditoriaView() {
  const {
    registros,
    cargando,
    error,
    moduloFiltro,
    busqueda,
    modulos,
    paginaActual,
    setPaginaActual,
    totalPaginas,
    totalRegistros,
    limite,
    setModuloFiltro,
    setBusqueda,
    handleBuscar,
    getModuloBadge,
    recargar
  } = useAuditoria();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER PRINCIPAL */}
      <AuditoriaHeader
        cargando={cargando}
        onActualizar={recargar}
        error={error}
      />

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <AuditoriaFiltros
        modulos={modulos}
        moduloFiltro={moduloFiltro}
        setModuloFiltro={setModuloFiltro}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        onBuscar={handleBuscar}
      />

      {/* TABLA DE AUDITORÍA */}
      <AuditoriaTabla
        registros={registros}
        cargando={cargando}
        getModuloBadge={getModuloBadge}
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        limite={limite}
        onCambiarPagina={setPaginaActual}
      />
    </div>
  );
}
