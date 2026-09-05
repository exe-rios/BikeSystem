import type { MovimientoStock } from '../../../types';

interface ModalHistorialMovimientosProps {
  visible: boolean;
  movimientos: MovimientoStock[];
  cargando: boolean;
  onClose: () => void;
}

export function ModalHistorialMovimientos({
  visible,
  movimientos,
  cargando,
  onClose
}: ModalHistorialMovimientosProps) {
  if (!visible) return null;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        width: 'min(860px, 100%)',
        maxHeight: '88vh',
        overflowY: 'auto',
        padding: '28px',
        borderRadius: '16px',
        border: '1px solid var(--borde-input)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
        color: 'var(--texto-principal)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--borde-input)', paddingBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
              Auditoría de Inventario
            </span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '2px 0 0 0' }}>
              Historial de Movimientos de Stock
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}
          >
            ✕
          </button>
        </div>

        {/* Contenido / Tabla */}
        {cargando ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
            Cargando historial de movimientos...
          </div>
        ) : movimientos.length === 0 ? (
          <div style={{
            padding: '36px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-principal)',
            borderRadius: '10px',
            color: 'var(--texto-mutado)'
          }}>
            No se han registrado movimientos de inventario aún.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--borde-input)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ backgroundColor: 'var(--bg-principal)', borderBottom: '1px solid var(--borde-input)' }}>
                <tr>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    Fecha / Hora
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    Artículo
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>
                    Tipo
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>
                    Cantidad
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    Motivo
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(m => {
                  const esIngreso = m.tipo_movimiento === 'INGRESO';
                  return (
                    <tr key={m.id_movimiento} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--texto-mutado)', whiteSpace: 'nowrap' }}>
                        {m.created_at ? new Date(m.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/D'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '600' }}>
                        <div>{m.producto_nombre}</div>
                        {(m.producto_marca || m.producto_modelo) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: 'normal' }}>
                            {m.producto_marca} {m.producto_modelo}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          backgroundColor: esIngreso ? 'rgba(22, 163, 74, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: esIngreso ? '#16a34a' : '#dc2626',
                          borderRadius: '20px',
                          padding: '2px 10px',
                          fontSize: '0.75rem',
                          fontWeight: '800'
                        }}>
                          {esIngreso ? 'INGRESO' : 'EGRESO'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', fontSize: '0.95rem' }}>
                        {m.cantidad}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: '600' }}>{m.motivo}</span>
                        {m.observaciones && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)', marginTop: '2px' }}>
                            {m.observaciones}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--texto-mutado)' }}>
                        {m.usuario_nombre || 'Sistema'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pie */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 22px',
              backgroundColor: 'var(--azul-oscuro)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
