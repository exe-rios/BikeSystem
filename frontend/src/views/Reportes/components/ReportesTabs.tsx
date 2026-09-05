import type { TabTipo } from '../types';

interface ReportesTabsProps {
  activeTab: TabTipo;
  ventasCount: number;
  reparacionesCount: number;
  onTabChange: (tab: TabTipo) => void;
}

export function ReportesTabs({
  activeTab,
  ventasCount,
  reparacionesCount,
  onTabChange
}: ReportesTabsProps) {
  const getTabStyle = (tab: TabTipo) => ({
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
    padding: '10px 18px',
    backgroundColor: activeTab === tab ? 'var(--azul-oscuro)' : 'transparent',
    color: activeTab === tab ? '#fff' : 'var(--texto-mutado)',
    border: 'none',
    borderRadius: '10px 10px 0 0',
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: activeTab === tab ? '0 -2px 8px rgba(0,0,0,0.05)' : 'none',
    whiteSpace: 'nowrap' as const
  });

  const getBadgeStyle = (tab: TabTipo) => ({
    backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
    color: activeTab === tab ? '#fff' : 'var(--texto-principal)',
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700'
  });

  return (
    <div className="no-imprimir" style={{
      display: 'flex',
      alignItems: 'center',
      borderBottom: '2px solid var(--borde-input)',
      paddingBottom: '2px',
      gap: '8px',
      overflowX: 'auto'
    }}>
      <button
        type="button"
        onClick={() => onTabChange('general')}
        style={getTabStyle('general')}
      >
        <span>Consolidado General</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('balance')}
        style={getTabStyle('balance')}
      >
        <span>Balance Financiero</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('top_productos')}
        style={getTabStyle('top_productos')}
      >
        <span>Productos Más Vendidos</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('ventas')}
        style={getTabStyle('ventas')}
      >
        <span>Ventas de Mostrador</span>
        <span style={getBadgeStyle('ventas')}>
          {ventasCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('reparaciones')}
        style={getTabStyle('reparaciones')}
      >
        <span>Taller y Reparaciones</span>
        <span style={getBadgeStyle('reparaciones')}>
          {reparacionesCount}
        </span>
      </button>
    </div>
  );
}
