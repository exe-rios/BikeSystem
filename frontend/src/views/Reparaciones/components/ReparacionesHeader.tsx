import type { VistaTabReparaciones } from '../types';

interface ReparacionesHeaderProps {
  vistaTab: VistaTabReparaciones;
  setVistaTab: (tab: VistaTabReparaciones) => void;
  activasCount: number;
  entregadasCount: number;
  onAbrirAlta: () => void;
}

export function ReparacionesHeader({
  vistaTab,
  setVistaTab,
  activasCount,
  entregadasCount,
  onAbrirAlta
}: ReparacionesHeaderProps) {
  return (
    <>
      {/* ENCABEZADO Y ACCIONES GLOBALES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>Gestión de Taller</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Control visual de services, asignación de repuestos y registro histórico</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onAbrirAlta}
            style={{
              backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
              padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
            }}
          >
            <span></span> Registrar Nueva Reparación
          </button>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN (TALLER ACTIVO vs HISTORIAL) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid var(--borde-input)',
        paddingBottom: '2px',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setVistaTab('activo')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              backgroundColor: vistaTab === 'activo' ? 'var(--azul-oscuro)' : 'transparent',
              color: vistaTab === 'activo' ? '#fff' : 'var(--texto-mutado)',
              border: 'none',
              borderRadius: '10px 10px 0 0',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: vistaTab === 'activo' ? '0 -2px 8px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            <span>Taller</span>
            <span style={{
              backgroundColor: vistaTab === 'activo' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
              color: vistaTab === 'activo' ? '#fff' : 'var(--texto-principal)',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '700'
            }}>
              {activasCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVistaTab('historial')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              backgroundColor: vistaTab === 'historial' ? 'var(--azul-oscuro)' : 'transparent',
              color: vistaTab === 'historial' ? '#fff' : 'var(--texto-mutado)',
              border: 'none',
              borderRadius: '10px 10px 0 0',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: vistaTab === 'historial' ? '0 -2px 8px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            <span> Historial de Entregas</span>
            <span style={{
              backgroundColor: vistaTab === 'historial' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
              color: vistaTab === 'historial' ? '#fff' : 'var(--texto-principal)',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '700'
            }}>
              {entregadasCount}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
