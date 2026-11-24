import type { TabTipo } from '../types';
import { formatearFecha, formatearFechaHora } from '../../../utils/formatters';

interface ReportesHeaderProps {
  activeTab: TabTipo;
  fechaDesde: string;
  fechaHasta: string;
  onExportar: () => void;
  onExportarPDF: () => void;
  onImprimir: () => void;
}

/** Cabecera del módulo de reportes con botones de exportación CSV, PDF e impresión. */
export function ReportesHeader({
  activeTab,
  fechaDesde,
  fechaHasta,
  onExportar,
  onExportarPDF,
  onImprimir
}: ReportesHeaderProps) {
  const getTituloPestana = () => {
    switch (activeTab) {
      case 'general': return 'Consolidado General';
      case 'inventario': return 'Inventario y Capital de Bicicletas';
      case 'ventas': return 'Ventas de Mostrador';
      case 'reparaciones': return 'Taller y Reparaciones';
      case 'balance': return 'Balance Financiero y Flujo de Caja';
      case 'top_productos': return 'Ranking de Productos Más Vendidos';
    }
  };

  return (
    <>
      {/* MEMBRETE EXCLUSIVO PARA IMPRESIÓN (A4 limpio estilo DN BIKES) */}
      <div className="imprimir-membrete">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              DN BIKES
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#475569' }}>
              Venta de Bicicletas, Repuestos y Taller Especializado
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Esperanza, Santa Fe, Argentina | Tel: 3496-412345
            </p>
          </div>
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 16px',
            textAlign: 'right',
            minWidth: '250px'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              INFORME ANALÍTICO
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
              {getTituloPestana()}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}>
              Período: {formatearFecha(fechaDesde, 'Inicio')} al {formatearFecha(fechaHasta, 'Hoy')}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
              Emisión: {formatearFechaHora(new Date(), '', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
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
            onClick={onExportarPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--azul-oscuro)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.15s ease'
            }}
          >
            Exportar PDF
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
