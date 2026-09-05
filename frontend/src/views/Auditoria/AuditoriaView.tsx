import { useAuditoria } from './hooks/useAuditoria';
import { AuditoriaHeader } from './components/AuditoriaHeader';
import { AuditoriaFiltros } from './components/AuditoriaFiltros';
import { AuditoriaTabla } from './components/AuditoriaTabla';

export function AuditoriaView() {
  const {
    registros,
    cargando,
    error,
    moduloFiltro,
    busqueda,
    modulos,
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
      />
    </div>
  );
}
