import { useState } from 'react';
import { useAuditoria } from './hooks/useAuditoria';
import { AuditoriaHeader } from './components/AuditoriaHeader';
import { AuditoriaFiltros } from './components/AuditoriaFiltros';
import { AuditoriaTabla } from './components/AuditoriaTabla';
import { ModalConfirmarBackup } from './components/ModalConfirmarBackup';
import { api } from '../../services/api';

/** Vista principal de auditoría y bitácora del sistema. */
export function AuditoriaView() {
  const [mostrarModalBackup, setMostrarModalBackup] = useState<boolean>(false);

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

  const handleDescargarBackup = async () => {
    await api.backup.descargarSql();
    await recargar();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER PRINCIPAL */}
      <AuditoriaHeader
        cargando={cargando}
        onActualizar={recargar}
        onDescargarBackup={() => setMostrarModalBackup(true)}
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

      {/* MODAL DE CONFIRMACIÓN DE RESPALDO SQL */}
      <ModalConfirmarBackup
        abierto={mostrarModalBackup}
        onClose={() => setMostrarModalBackup(false)}
        onConfirmar={handleDescargarBackup}
      />
    </div>
  );
}
