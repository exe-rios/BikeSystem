import { useReportes } from './hooks/useReportes';
import { ReportesHeader } from './components/ReportesHeader';
import { ReportesTabs } from './components/ReportesTabs';
import { ReportesFiltros } from './components/ReportesFiltros';
import { ReportesKPIs } from './components/ReportesKPIs';
import { TabConsolidado } from './tabs/TabConsolidado';
import { TabBalance } from './tabs/TabBalance';
import { TabTopProductos } from './tabs/TabTopProductos';
import { TabVentas } from './tabs/TabVentas';
import { TabTaller } from './tabs/TabTaller';

export function ReportesView() {
  const {
    activeTab,
    setActiveTab,
    rangoRapido,
    fechaDesde,
    fechaHasta,
    searchTerm,
    estadoTallerFiltro,
    setFechaDesde,
    setFechaHasta,
    setSearchTerm,
    setEstadoTallerFiltro,
    aplicarRangoRapido,
    dashboard,
    kpis,
    estadisticasTaller,
    ventas,
    ventasResumen,
    reparaciones,
    reparacionesResumen,
    pagos,
    topProductosList,
    maxVentasProducto,
    cargando,
    error,
    handleExportar,
    handleImprimir
  } = useReportes();

  return (
    <div className="imprimible" style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', color: 'var(--texto-principal)' }}>
      
      {/* 1. Header con Título y Botones de Acción */}
      <ReportesHeader
        activeTab={activeTab}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        onExportar={handleExportar}
        onImprimir={handleImprimir}
      />

      {/* Alerta de Error si ocurre */}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* 2. Pestañas de Navegación */}
      <ReportesTabs
        activeTab={activeTab}
        ventasCount={ventas.length}
        reparacionesCount={reparaciones.length}
        onTabChange={setActiveTab}
      />

      {/* 3. Filtros Avanzados y Rango Rápido */}
      <ReportesFiltros
        activeTab={activeTab}
        rangoRapido={rangoRapido}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        searchTerm={searchTerm}
        estadoTallerFiltro={estadoTallerFiltro}
        onCambiarRango={aplicarRangoRapido}
        onCambiarFechaDesde={setFechaDesde}
        onCambiarFechaHasta={setFechaHasta}
        onCambiarBusqueda={setSearchTerm}
        onCambiarEstadoTaller={setEstadoTallerFiltro}
      />

      {/* 4. Indicadores KPI Financieros */}
      <ReportesKPIs kpis={kpis} />

      {/* 5. Contenido Modular por Pestaña */}
      {activeTab === 'general' && (
        <TabConsolidado
          kpis={kpis}
          estadisticasTaller={estadisticasTaller}
          dashboard={dashboard}
          onVerRankingCompleto={() => setActiveTab('top_productos')}
        />
      )}

      {activeTab === 'balance' && (
        <TabBalance
          kpis={kpis}
          pagos={pagos}
        />
      )}

      {activeTab === 'top_productos' && (
        <TabTopProductos
          topProductosList={topProductosList}
          maxVentasProducto={maxVentasProducto}
        />
      )}

      {activeTab === 'ventas' && (
        <TabVentas
          ventas={ventas}
          cargando={cargando}
          totalVentasMonto={kpis.total_ventas_monto}
          ventasResumen={ventasResumen}
        />
      )}

      {activeTab === 'reparaciones' && (
        <TabTaller
          reparaciones={reparaciones}
          cargando={cargando}
          totalManoObraMonto={kpis.total_mano_obra_monto}
          totalReparacionesMonto={kpis.total_reparaciones_monto}
          reparacionesResumen={reparacionesResumen}
        />
      )}

    </div>
  );
}
