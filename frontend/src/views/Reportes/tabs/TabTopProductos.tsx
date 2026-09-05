import type { DashboardTopProducto } from '../../../types';

interface TabTopProductosProps {
  topProductosList: DashboardTopProducto[];
  maxVentasProducto: number;
}

export function TabTopProductos({
  topProductosList,
  maxVentasProducto
}: TabTopProductosProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--borde-input)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--borde-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>Ranking de Rotación de Artículos (Top 10)</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--texto-mutado)' }}>
              Artículos con mayor demanda histórica en ventas y taller
            </p>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)' }}>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase', width: '80px', textAlign: 'center' }}>Posición</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Producto</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Marca</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Categoría</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase', width: '220px' }}>Rotación / Demanda</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Total Recaudado</th>
            </tr>
          </thead>
          <tbody>
            {topProductosList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  No se encontraron registros de ventas acumuladas.
                </td>
              </tr>
            ) : (
              topProductosList.map((item, idx) => {
                const porcentajeBarra = Math.round((Number(item.total_vendido) / maxVentasProducto) * 100);
                return (
                  <tr key={item.id_producto} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.9rem', fontWeight: '700', color: 'var(--texto-mutado)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: '600' }}>
                      {item.nombre}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: 'var(--texto-mutado)' }}>
                      {item.marca || 'Genérico'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-principal)', border: '1px solid var(--borde-input)', textTransform: 'capitalize' }}>
                        {item.tipo_prod}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: porcentajeBarra + '%', height: '100%', backgroundColor: '#2563eb' }} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', minWidth: '45px', textAlign: 'right' }}>
                          {item.total_vendido} u.
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: '700', textAlign: 'right', color: '#16a34a' }}>
                      {'$' + Number(item.total_recaudado || 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
