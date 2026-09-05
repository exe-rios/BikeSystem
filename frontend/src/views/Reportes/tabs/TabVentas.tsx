import type { Venta } from '../../../types';

interface TabVentasProps {
  ventas: Venta[];
  cargando: boolean;
  totalVentasMonto: number;
  ventasResumen: {
    totalFacturado: number;
    cobradas: number;
    anuladas: number;
  };
}

export function TabVentas({
  ventas,
  cargando,
  totalVentasMonto,
  ventasResumen
}: TabVentasProps) {

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--borde-input)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)' }}>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Comprobante</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Fecha</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Cliente</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Vendedor</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Importe Total</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando listado de ventas...
                </td>
              </tr>
            ) : ventas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  No se encontraron ventas para los filtros aplicados.
                </td>
              </tr>
            ) : (
              ventas.map((item) => {
                const esAnulada = item.estado === 'ANULADA';
                return (
                  <tr key={item.id_venta} style={{ borderBottom: '1px solid var(--borde-input)', opacity: esAnulada ? 0.6 : 1 }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: 'var(--texto-mutado)', fontFamily: 'monospace', fontWeight: '600' }}>
                      FAC-{String(item.id_venta).padStart(6, '0')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem' }}>
                      {item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: '600' }}>
                      {item.cliente_nombre ? `${item.cliente_apellido}, ${item.cliente_nombre}` : `Cliente #${item.id_cliente}`}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                      {item.vendedor || 'Sistema'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: esAnulada ? 'rgba(239, 68, 68, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                        color: esAnulada ? '#dc2626' : '#16a34a',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {esAnulada ? 'ANULADA' : 'COMPLETADA'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: '700', textAlign: 'right', color: esAnulada ? 'var(--texto-mutado)' : '#16a34a', textDecoration: esAnulada ? 'line-through' : 'none' }}>
                      {'$' + Number(item.costo_total).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Subtotales al pie de la tabla */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tarjeta)', padding: '14px 20px', borderRadius: '10px', border: '1px solid var(--borde-input)', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--texto-mutado)' }}>
          Mostrando <strong>{ventas.length}</strong> ventas ({ventasResumen.cobradas} cobradas{ventasResumen.anuladas > 0 ? `, ${ventasResumen.anuladas} anuladas` : ''}) en el período seleccionado.
        </span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)', marginRight: '12px' }}>Total Facturado (Cobrado):</span>
          <strong style={{ fontSize: '1.2rem', color: '#16a34a' }}>{'$' + totalVentasMonto.toLocaleString()}</strong>
        </div>
      </div>
    </div>
  );
}
