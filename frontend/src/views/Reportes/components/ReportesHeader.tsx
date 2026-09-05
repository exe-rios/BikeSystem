import type { TabTipo } from '../types';

interface ReportesHeaderProps {
  activeTab: TabTipo;
  fechaDesde: string;
  fechaHasta: string;
  onExportar: () => void;
  onImprimir: () => void;
}

export function ReportesHeader({
  activeTab,
  fechaDesde,
  fechaHasta,
  onExportar,
  onImprimir
}: ReportesHeaderProps) {
  const getTituloPestana = () => {
    switch (activeTab) {
      case 'general': return 'Consolidado General';
      case 'ventas': return 'Ventas de Mostrador';
      case 'reparaciones': return 'Taller y Reparaciones';
      case 'balance': return 'Balance Financiero y Flujo de Caja';
      case 'top_productos': return 'Ranking de Productos Más Vendidos';
    }
  };

  return (
    <>
      {/* MEMBRETE EXCLUSIVO PARA IMPRESIÓN */}
      <div className="imprimir-membrete">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px' }}>BIKESYSTEM</h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.9rem', color: '#475569' }}>
              Informe Ejecutivo &bull; {getTituloPestana()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>INFORME ANALÍTICO</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Período: {fechaDesde ? new Date(fechaDesde).toLocaleDateString() : 'Inicio'} &rarr; {fechaHasta ? new Date(fechaHasta).toLocaleDateString() : 'Hoy'}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Emisión: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* CABECERA PRINCIPAL */}
      <div className="no-imprimir" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: 'var(--texto-principal)', fontSize: '2rem', fontWeight: '700', margin: 0 }}>Gestión de Reportes</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Auditoría, flujo de caja y análisis estadístico de rendimiento comercial y de taller
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onExportar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-tarjeta)',
              color: 'var(--texto-principal)',
              border: '1px solid var(--borde-input)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            Exportar CSV (Excel)
          </button>
          <button
            type="button"
            onClick={onImprimir}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--azul-oscuro)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.15s ease'
            }}
          >
            Imprimir Reporte
          </button>
        </div>
      </div>
    </>
  );
}
