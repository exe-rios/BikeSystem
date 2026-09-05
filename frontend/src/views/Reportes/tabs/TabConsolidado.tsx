import type { ReporteKPIs, ReporteEstadisticasTaller, DashboardData } from '../../../types';

interface TabConsolidadoProps {
  kpis: ReporteKPIs;
  estadisticasTaller: ReporteEstadisticasTaller;
  dashboard: DashboardData | null;
  onVerRankingCompleto: () => void;
}

export function TabConsolidado({
  kpis,
  estadisticasTaller,
  dashboard,
  onVerRankingCompleto
}: TabConsolidadoProps) {
  const topProductosList = dashboard?.top_productos || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Gráfico y Distribución de Ingresos Efectivos */}
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)', padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>
            Distribución de Ingresos Efectivos (Ventas + Taller Entregado)
          </h3>
          <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#15803d', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' }}>
            Solo recaudación realizada
          </span>
        </div>

        {/* Barra de progreso bicolor */}
        <div style={{ width: '100%', height: '20px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
          <div
            style={{
              width: kpis.porcentaje_ventas + '%',
              backgroundColor: '#2563eb',
              transition: 'width 0.4s ease'
            }}
            title={'Ventas: ' + kpis.porcentaje_ventas + '%'}
          />
          <div
            style={{
              width: kpis.porcentaje_taller + '%',
              backgroundColor: '#ea580c',
              transition: 'width 0.4s ease'
            }}
            title={'Taller (Entregadas): ' + kpis.porcentaje_taller + '%'}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.9rem', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', borderRadius: '3px', display: 'inline-block' }}></span>
            <span style={{ fontWeight: '600' }}>Ventas de Mostrador:</span>
            <span>{'$' + kpis.total_ventas_monto.toLocaleString() + ' (' + kpis.porcentaje_ventas + '%)'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#ea580c', borderRadius: '3px', display: 'inline-block' }}></span>
            <span style={{ fontWeight: '600' }}>Taller (Entregadas):</span>
            <span>{'$' + kpis.total_reparaciones_monto.toLocaleString() + ' (' + kpis.porcentaje_taller + '%)'}</span>
          </div>
        </div>
      </div>

      {/* Grid de 2 columnas: Top 5 Productos y Rendimiento del Taller */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Top Productos Resumen */}
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>
              Top Productos Más Vendidos
            </h3>
            <button
              type="button"
              onClick={onVerRankingCompleto}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Ver Ranking Completo &rarr;
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topProductosList.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--texto-mutado)', textAlign: 'center', fontSize: '0.88rem' }}>
                No hay registros de ventas suficientes.
              </div>
            ) : (
              topProductosList.slice(0, 5).map((prod, index) => (
                <div key={prod.id_producto} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-principal)', borderRadius: '8px', border: '1px solid var(--borde-input)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--texto-mutado)', minWidth: '16px' }}>
                      {index + 1}
                    </span>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '600', color: 'var(--texto-principal)' }}>{prod.nombre}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>{prod.marca || 'Genérico'} &bull; {prod.tipo_prod}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#16a34a', display: 'block' }}>
                      {'$' + Number(prod.total_recaudado || 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)' }}>
                      {prod.total_vendido} unidades
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rendimiento del Taller */}
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>
              Rendimiento del Taller ({estadisticasTaller.entregadas + kpis.total_ordenes_en_proceso} órdenes)
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Entregadas (Recaudado)', count: estadisticasTaller.entregadas, monto: kpis.total_reparaciones_monto, cobrado: true },
              { label: 'Listas para Retiro', count: estadisticasTaller.listas, cobrado: false },
              { label: 'En Reparación', count: estadisticasTaller.en_reparacion, cobrado: false },
              { label: 'Recibidas', count: estadisticasTaller.recibidas, cobrado: false },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-principal)', borderRadius: '8px', border: '1px solid var(--borde-input)' }}>
                <div>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)', display: 'block' }}>{item.label}</span>
                  {item.cobrado && (
                    <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: '700' }}>
                      Ingreso efectivo: {'$' + item.monto?.toLocaleString()}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>

          {kpis.total_ordenes_en_proceso > 0 && (
            <div style={{ marginTop: '14px', padding: '10px 14px', backgroundColor: 'rgba(234, 88, 12, 0.06)', borderRadius: '8px', border: '1px dashed #fdba74', fontSize: '0.82rem', color: '#c2410c' }}>
              <strong>Pendiente de cobro:</strong> {kpis.total_ordenes_en_proceso} órdenes en taller por un valor estimado de <strong>{'$' + kpis.monto_estimado_en_proceso.toLocaleString()}</strong> (se contabilizan al ser entregadas).
            </div>
          )}
        </div>

      </div>

      {/* Alertas de Stock Crítico */}
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)', padding: '22px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: '0 0 16px 0', color: '#ef4444' }}>
          Alertas de Stock Crítico
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {(!dashboard?.alertas_stock || dashboard.alertas_stock.length === 0) ? (
            <div style={{ padding: '16px', backgroundColor: 'rgba(22, 163, 74, 0.06)', borderRadius: '8px', color: '#15803d', fontSize: '0.9rem', fontWeight: '500', gridColumn: '1 / -1' }}>
              ✓ Todos los productos se encuentran por encima de su stock mínimo.
            </div>
          ) : (
            dashboard.alertas_stock.slice(0, 6).map((prod) => (
              <div key={prod.id_producto} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--bg-principal)', borderRadius: '8px', border: '1px solid var(--borde-input)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '600', color: 'var(--texto-principal)' }}>{prod.nombre}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>{prod.marca || 'Sin marca'} &bull; Mínimo: {prod.stock_minimo}</p>
                </div>
                <span style={{ padding: '4px 10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700' }}>
                  {prod.cantidad} unid.
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
