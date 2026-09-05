import iconAlerta from '../../../assets/Fotinhos/alerta.png';
import type { DashboardData } from '../types';

interface InicioAlertasStockProps {
  cargando: boolean;
  dashboard: DashboardData | null;
  onNavigate: (view: string) => void;
}

export function InicioAlertasStock({
  cargando,
  dashboard,
  onNavigate
}: InicioAlertasStockProps) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-tarjeta)',
      borderRadius: '14px',
      border: '1px solid var(--borde-input)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
    }}>
      <div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: '0 0 16px 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={iconAlerta} alt="Alertas de Stock" style={{ width: '22px', height: '22px' }} />
          Alertas de Stock Bajo
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cargando ? (
            <p style={{ color: 'var(--texto-mutado)', fontSize: '0.85rem' }}>Verificando stock...</p>
          ) : (!dashboard?.alertas_stock || dashboard.alertas_stock.length === 0) ? (
            <div style={{ padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', color: '#065f46', fontSize: '0.9rem', fontWeight: '500' }}>
              ✓ Todos los productos tienen stock por encima del mínimo.
            </div>
          ) : (
            dashboard.alertas_stock.map((item) => (
              <div key={item.id_producto} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--bg-principal)', border: '1px solid var(--borde-input)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>{item.nombre} {item.marca ? `(${item.marca})` : ''}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Stock: {item.cantidad} / Mínimo: {item.stock_minimo}</p>
                  </div>
                  <span style={{ padding: '4px 10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>BAJO</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <button
        onClick={() => onNavigate('stock')}
        style={{ width: '100%', marginTop: '16px', padding: '11px', backgroundColor: 'transparent', color: 'var(--texto-principal)', border: '1px solid var(--borde-input)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600' }}
      >
        Ver inventario completo →
      </button>
    </div>
  );
}
