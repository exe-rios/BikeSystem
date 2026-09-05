import type { TabVentasTipo } from '../types';

interface VentasHeaderProps {
  tabActiva: TabVentasTipo;
  totalVentas: number;
  totalGarantias: number;
  countPorVencer?: number;
  onTabChange: (tab: TabVentasTipo) => void;
  onNuevaVenta: () => void;
}

export function VentasHeader({
  tabActiva,
  totalVentas,
  totalGarantias,
  countPorVencer = 0,
  onTabChange,
  onNuevaVenta
}: VentasHeaderProps) {
  const getTabStyle = (tab: TabVentasTipo) => ({
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
    padding: '10px 18px',
    backgroundColor: tabActiva === tab ? 'var(--azul-oscuro)' : 'transparent',
    color: tabActiva === tab ? '#fff' : 'var(--texto-mutado)',
    border: 'none',
    borderRadius: '10px 10px 0 0',
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: tabActiva === tab ? '0 -2px 8px rgba(0,0,0,0.05)' : 'none',
    whiteSpace: 'nowrap' as const
  });

  const getBadgeStyle = (tab: TabVentasTipo) => ({
    backgroundColor: tabActiva === tab ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
    color: tabActiva === tab ? '#fff' : 'var(--texto-principal)',
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Barra de Título y Botón Nueva Venta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: 'var(--texto-principal)', fontSize: '2rem', fontWeight: '700', margin: 0 }}>Gestión de Ventas</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Registro de operaciones comerciales, comprobantes y garantías de bicicletas
          </p>
        </div>

        <button
          type="button"
          onClick={onNuevaVenta}
          style={{
            backgroundColor: 'var(--azul-oscuro)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
        >
          Nueva Venta
        </button>
      </div>

      {/* Pestañas de Navegación Unificadas */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid var(--borde-input)',
        paddingBottom: '2px',
        gap: '8px',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => onTabChange('ventas')}
          style={getTabStyle('ventas')}
        >
          <span>Ventas de Mostrador</span>
          <span style={getBadgeStyle('ventas')}>
            {totalVentas}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('garantias')}
          style={getTabStyle('garantias')}
        >
          <span>Garantías de Bicicletas</span>
          {countPorVencer > 0 && (
            <span style={{
              backgroundColor: '#f59e0b',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: '700'
            }}>
              {countPorVencer} por vencer
            </span>
          )}
          <span style={getBadgeStyle('garantias')}>
            {totalGarantias}
          </span>
        </button>
      </div>

    </div>
  );
}
