import type { Venta, Reparacion } from '../types';

interface InicioUltimosMovimientosProps {
  ultimasVentas: Venta[];
  ultimasReparaciones: Reparacion[];
}

export function InicioUltimosMovimientos({
  ultimasVentas,
  ultimasReparaciones
}: InicioUltimosMovimientosProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

      {/* ÚLTIMAS VENTAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>Últimas Ventas Emitidas</h3>
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>FAC</th>
                <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Cliente</th>
                <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ultimasVentas.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.85rem' }}>
                    Sin ventas recientes
                  </td>
                </tr>
              ) : (
                ultimasVentas.map((v) => (
                  <tr key={v.id_venta} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--texto-mutado)' }}>
                      FAC-{String(v.id_venta).padStart(4, '0')}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: '500' }}>
                      {v.cliente_nombre ? `${v.cliente_apellido}, ${v.cliente_nombre}` : `Cliente #${v.id_cliente}`}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: '700', color: '#16a34a', textAlign: 'right' }}>
                      ${Number(v.costo_total).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ÚLTIMAS ÓRDENES DE TALLER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>Últimas Reparaciones Ingresadas</h3>
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Orden</th>
                <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Bicicleta</th>
                <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {ultimasReparaciones.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.85rem' }}>
                    Sin órdenes recientes
                  </td>
                </tr>
              ) : (
                ultimasReparaciones.map((r) => (
                  <tr key={r.id_reparacion} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--texto-mutado)' }}>
                      #{r.id_reparacion}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: '500' }}>
                      {r.marca} {r.modelo}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        backgroundColor:
                          r.estado === 'Lista' ? '#ccfbf1' :
                            r.estado === 'En Reparación' ? '#ffedd5' :
                              r.estado === 'Recibida' ? '#fef3c7' : '#f1f5f9',
                        color:
                          r.estado === 'Lista' ? '#0f766e' :
                            r.estado === 'En Reparación' ? '#c2410c' :
                              r.estado === 'Recibida' ? '#b45309' : '#475569'
                      }}>
                        {r.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
