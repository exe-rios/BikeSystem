import type { Venta } from '../../../types';

interface TabVentasListadoProps {
  ventas: Venta[];
  totalVentas: number;
  cargando: boolean;
  busquedaVenta: string;
  onCambiarBusqueda: (busqueda: string) => void;
  onVerDetalle: (idVenta: number) => void;
}

export function TabVentasListado({
  ventas,
  totalVentas,
  cargando,
  busquedaVenta,
  onCambiarBusqueda,
  onVerDetalle
}: TabVentasListadoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* CONTADORES Y BUSCADOR DE VENTAS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)', padding: '10px 18px', borderRadius: '10px',
          display: 'inline-flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Total Comprobantes Emitidos</span>
          <span style={{
            backgroundColor: '#ff9248', color: '#fff', padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
          }}>{totalVentas}</span>
        </div>

        <input
          type="text"
          placeholder="Buscar por comprobante, cliente o vendedor..."
          value={busquedaVenta}
          onChange={e => onCambiarBusqueda(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)',
            color: 'var(--texto-principal)',
            width: '340px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* TABLA DE VENTAS */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Comprobante</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Cliente</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Fecha</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Método Pago</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Vendedor</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Estado</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ width: '96px', textAlign: 'center' }}>Acciones</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando ventas...
                </td>
              </tr>
            ) : ventas.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  {totalVentas === 0 ? 'No hay ventas registradas en el sistema.' : 'No se encontraron ventas con el filtro de búsqueda.'}
                </td>
              </tr>
            ) : (
              ventas.map(v => {
                const nombreCliente = v.cliente_nombre ? `${v.cliente_apellido}, ${v.cliente_nombre}` : `Cliente #${v.id_cliente}`;
                const esAnulada = v.estado === 'ANULADA';

                return (
                  <tr
                    key={v.id_venta}
                    onClick={() => v.id_venta != null && onVerDetalle(v.id_venta)}
                    style={{
                      borderBottom: '1px solid var(--borde-input)',
                      cursor: 'pointer',
                      backgroundColor: esAnulada ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = esAnulada ? 'rgba(239, 68, 68, 0.05)' : 'rgba(37, 99, 235, 0.03)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = esAnulada ? 'rgba(239, 68, 68, 0.02)' : 'transparent'}
                  >
                    <td style={{ padding: '16px', fontSize: '0.95rem', color: esAnulada ? '#ef4444' : 'var(--azul-oscuro)', fontFamily: 'monospace', fontWeight: '700' }}>
                      FAC-{String(v.id_venta).padStart(6, '0')}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
                      {nombreCliente}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>
                      {v.fecha ? new Date(v.fecha).toLocaleDateString() : 'Hoy'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        backgroundColor: 'var(--bg-principal)',
                        border: '1px solid var(--borde-input)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        color: 'var(--texto-principal)'
                      }}>
                        {v.metodo_pago_nombre || 'Efectivo'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--texto-mutado)' }}>
                      {v.vendedor || 'Sistema'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        backgroundColor: esAnulada ? 'rgba(239, 68, 68, 0.12)' : 'rgba(22, 163, 74, 0.12)',
                        color: esAnulada ? '#dc2626' : '#16a34a',
                        border: esAnulada ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(22, 163, 74, 0.3)',
                        borderRadius: '20px',
                        padding: '3px 10px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {esAnulada ? 'Anulada' : 'Completada'}
                      </span>
                    </td>
                    <td style={{
                      padding: '16px',
                      fontWeight: '800',
                      color: esAnulada ? '#94a3b8' : 'var(--texto-mutado)',
                      textAlign: 'right',
                      fontSize: '1.05rem',
                      textDecoration: esAnulada ? 'line-through' : 'none'
                    }}>
                      ${Number(v.costo_total).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (v.id_venta != null) onVerDetalle(v.id_venta);
                        }}
                        style={{
                          backgroundColor: 'rgba(37, 99, 235, 0.08)',
                          color: 'var(--azul-oscuro)',
                          border: '1px solid rgba(37, 99, 235, 0.2)',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>Ver Detalle</span>
                      </button>
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
