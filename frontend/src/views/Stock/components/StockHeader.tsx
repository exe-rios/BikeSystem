import type { ResumenStock } from '../../../types';

interface StockHeaderProps {
  resumen: ResumenStock;
  onAbrirCrear: () => void;
  onAbrirAjuste: () => void;
  onAbrirHistorial: () => void;
}

export function StockHeader({
  resumen,
  onAbrirCrear,
  onAbrirAjuste,
  onAbrirHistorial
}: StockHeaderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Título y Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: 'var(--texto-principal)' }}>
            Gestión de Inventario y Stock
          </h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Control de existencias en tiempo real, catálogo de artículos y movimientos
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onAbrirHistorial}
            style={{
              backgroundColor: 'var(--azul-oscuro)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
            }}
          >
            Movimientos Stock
          </button>

          <button
            type="button"
            onClick={onAbrirAjuste}
            style={{
              backgroundColor: 'var(--azul-oscuro)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
            }}
          >
            Ajuste de Stock
          </button>

          <button
            type="button"
            onClick={onAbrirCrear}
            style={{
              backgroundColor: 'var(--azul-oscuro)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
            }}
          >
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Tarjetas KPIs de Inventario */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-tarjeta)',
          border: '1px solid var(--borde-input)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
            Artículos en Catálogo
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--texto-principal)' }}>
            {resumen.total_articulos}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)' }}>
            Variedades de productos registrados
          </span>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-tarjeta)',
          border: '1px solid var(--borde-input)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
            Unidades Totales
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--azul-oscuro)' }}>
            {resumen.total_unidades.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)' }}>
            Existencias físicas globales
          </span>
        </div>

        <div style={{
          backgroundColor: resumen.bajo_stock_count > 0 ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-tarjeta)',
          border: `1px solid ${resumen.bajo_stock_count > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--borde-input)'}`,
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: resumen.bajo_stock_count > 0 ? '#dc2626' : 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              Bajo Stock / Alerta
            </span>
            {resumen.bajo_stock_count > 0 && (
              <span style={{ fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                Reabastecer
              </span>
            )}
          </div>
          <span style={{ fontSize: '1.6rem', fontWeight: '800', color: resumen.bajo_stock_count > 0 ? '#dc2626' : 'var(--texto-principal)' }}>
            {resumen.bajo_stock_count}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)' }}>
            Artículos por debajo del stock mínimo
          </span>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-tarjeta)',
          border: '1px solid var(--borde-input)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
            Inactivos (Baja)
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--texto-mutado)' }}>
            {resumen.inactivos_count}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)' }}>
            No visibles para ventas y taller
          </span>
        </div>
      </div>
    </div>
  );
}
