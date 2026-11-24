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
import { TabCapitalInventario } from './tabs/TabCapitalInventario';

/** Vista de analítica empresarial, flujo de caja y balance operativo. */
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
    setRangoRapido,
    aplicarRangoRapido,
    dashboard,
    kpis,
    estadisticasTaller,
    ventas,
    ventasResumen,
    paginaVentas,
    setPaginaVentas,
    totalPaginasVentas,
    totalVentasRegistros,
    reparaciones,
    reparacionesResumen,
    paginaReparaciones,
    setPaginaReparaciones,
    totalPaginasReparaciones,
    totalReparacionesRegistros,
    pagos,
    egresosResumen,
    paginaPagos,
    setPaginaPagos,
    totalPaginasPagos,
    totalPagosRegistros,
    limitePaginacion,
    topProductosList,
    maxVentasProducto,
    capitalStockData,
    bicicletasCount,
    cargando,
    error,
    handleExportar,
    handleExportarPDF,
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
        onExportarPDF={handleExportarPDF}
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
        ventasCount={totalVentasRegistros}
        reparacionesCount={totalReparacionesRegistros}
        bicicletasCount={bicicletasCount}
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
        onCambiarFechaDesde={(f) => {
          setRangoRapido('personalizado');
          setFechaDesde(f);
        }}
        onCambiarFechaHasta={(f) => {
          setRangoRapido('personalizado');
          setFechaHasta(f);
        }}
        onCambiarBusqueda={setSearchTerm}
        onCambiarEstadoTaller={setEstadoTallerFiltro}
      />

      {/* 4. Indicadores KPI Financieros (ocultos al imprimir rankings o inventario) */}
      <div className={activeTab === 'top_productos' || activeTab === 'inventario' ? 'no-imprimir' : ''}>
        <ReportesKPIs kpis={kpis} />
      </div>

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
          egresosResumen={egresosResumen}
          paginaActual={paginaPagos}
          totalPaginas={totalPaginasPagos}
          totalRegistros={totalPagosRegistros}
          limite={limitePaginacion}
          onCambiarPagina={setPaginaPagos}
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
          totalVentasMonto={ventasResumen.totalFacturado}
          ventasResumen={ventasResumen}
          paginaActual={paginaVentas}
          totalPaginas={totalPaginasVentas}
          totalRegistros={totalVentasRegistros}
          limite={limitePaginacion}
          onCambiarPagina={setPaginaVentas}
        />
      )}

      {activeTab === 'reparaciones' && (
        <TabTaller
          reparaciones={reparaciones}
          cargando={cargando}
          totalManoObraMonto={reparacionesResumen.totalManoObra}
          totalReparacionesMonto={reparacionesResumen.totalRecaudado}
          reparacionesResumen={reparacionesResumen}
          paginaActual={paginaReparaciones}
          totalPaginas={totalPaginasReparaciones}
          totalRegistros={totalReparacionesRegistros}
          limite={limitePaginacion}
          onCambiarPagina={setPaginaReparaciones}
        />
      )}

      {activeTab === 'inventario' && (
        <TabCapitalInventario
          data={capitalStockData}
          cargando={cargando}
          onExportarCSV={handleExportar}
        />
      )}

      {/* PIE DE PÁGINA IMPRESIÓN */}
      <div className="imprimir-flex" style={{ marginTop: '12px', paddingTop: '10px', fontSize: '0.78rem', borderTop: '1px solid #cbd5e1' }}>
        <div>
          <strong style={{ color: '#0f172a' }}>INFORME DE GESTIÓN COMERCIAL INTERNA</strong><br />
          <span style={{ color: '#64748b' }}>
            Generado por <strong>DN BIKES</strong> &bull; Esperanza, Santa Fe.
          </span>
        </div>
      </div>

    </div>
  );
}
