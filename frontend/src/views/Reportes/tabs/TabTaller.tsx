import type { Reparacion } from '../../../types';

interface TabTallerProps {
  reparaciones: Reparacion[];
  cargando: boolean;
  totalManoObraMonto: number;
  totalReparacionesMonto: number;
  reparacionesResumen: {
    totalRecaudado: number;
    totalManoObra: number;
    entregadas: number;
    enProceso: number;
    montoEnProceso: number;
  };
}

export function TabTaller({
  reparaciones,
  cargando,
  totalManoObraMonto,
  totalReparacionesMonto,
  reparacionesResumen
}: TabTallerProps) {
  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'Recibida':
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      case 'En Reparación':
        return { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' };
      case 'Lista':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' };
      case 'Entregada':
        return { bg: '#f0fdf4', color: '#15803d', border: '#86efac' };
      default:
        return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--borde-input)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)' }}>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Orden Nº</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Ingreso</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Entrega</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Cliente</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Bicicleta</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Mano de Obra</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Costo Total</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando órdenes de taller...
                </td>
              </tr>
            ) : reparaciones.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  No se encontraron órdenes de taller con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              reparaciones.map((item) => {
                const badge = getBadgeEstado(item.estado);
                const esEntregada = item.estado === 'Entregada';
                return (
                  <tr key={item.id_reparacion} style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: esEntregada ? 'transparent' : 'rgba(248, 250, 252, 0.7)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: 'var(--texto-mutado)', fontFamily: 'monospace', fontWeight: '600' }}>
                      REP-{String(item.id_reparacion).padStart(6, '0')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem' }}>
                      {item.fecha_ingreso ? new Date(item.fecha_ingreso).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: item.fecha_egreso ? 'var(--texto-principal)' : '#94a3b8' }}>
                      {item.fecha_egreso ? new Date(item.fecha_egreso).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: '600' }}>
                      {item.cliente_nombre ? `${item.cliente_apellido}, ${item.cliente_nombre}` : `Cliente #${item.id_bicicleta}`}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: 'var(--texto-mutado)' }}>
                      {item.marca ? `${item.marca} ${item.modelo || ''}` : 'Bicicleta'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: '1px solid ' + badge.border,
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: '700'
                      }}>
                        {item.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', textAlign: 'right', color: 'var(--texto-mutado)' }}>
                      {'$' + Number(item.costo_mano_obra || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: '700', textAlign: 'right', color: esEntregada ? '#16a34a' : 'var(--texto-mutado)' }}>
                      {'$' + Number(item.costo_total || item.costo_mano_obra || 0).toLocaleString()}
                      {!esEntregada && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#ea580c', fontWeight: '600' }}>
                          (Pendiente)
                        </span>
                      )}
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
          Total: <strong>{reparaciones.length}</strong> órdenes &bull; <strong>{reparacionesResumen.entregadas}</strong> entregadas (cobradas) y <strong>{reparacionesResumen.enProceso}</strong> en curso.
        </span>
        <div style={{ textAlign: 'right', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', marginRight: '6px' }}>Mano de Obra Cobrada:</span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--texto-principal)' }}>{'$' + totalManoObraMonto.toLocaleString()}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', marginRight: '6px' }}>Recaudación Efectiva (Entregadas):</span>
            <strong style={{ fontSize: '1.25rem', color: '#16a34a' }}>{'$' + totalReparacionesMonto.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
