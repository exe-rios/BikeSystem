import { useState, useMemo } from 'react';
import type { MovimientoStock } from '../../../types';
import { formatearFechaHora } from '../../../utils/formatters';

interface ModalHistorialMovimientosProps {
  visible: boolean;
  movimientos: MovimientoStock[];
  cargando: boolean;
  onClose: () => void;
}

/** Modal con listado cronológico de movimientos de entrada y salida de stock. */
export function ModalHistorialMovimientos({
  visible,
  movimientos,
  cargando,
  onClose
}: ModalHistorialMovimientosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS');

  // Conteo de tipos
  const { conteoIngresos, conteoEgresos } = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;
    for (const m of movimientos) {
      if (m.tipo_movimiento === 'INGRESO') ingresos++;
      else if (m.tipo_movimiento === 'EGRESO') egresos++;
    }
    return { conteoIngresos: ingresos, conteoEgresos: egresos };
  }, [movimientos]);

  // Filtrado reactivo en memoria
  const movimientosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return movimientos.filter(m => {
      // Filtro por tipo
      if (filtroTipo !== 'TODOS' && m.tipo_movimiento !== filtroTipo) {
        return false;
      }
      // Filtro por término de búsqueda
      if (!term) return true;
      const coincideProducto = (m.producto_nombre || '').toLowerCase().includes(term) ||
        (m.producto_marca || '').toLowerCase().includes(term) ||
        (m.producto_modelo || '').toLowerCase().includes(term);
      const coincideMotivo = (m.motivo || '').toLowerCase().includes(term);
      const coincideObs = (m.observaciones || '').toLowerCase().includes(term);
      const coincideUsuario = (m.usuario_nombre || '').toLowerCase().includes(term);

      return coincideProducto || coincideMotivo || coincideObs || coincideUsuario;
    });
  }, [movimientos, busqueda, filtroTipo]);

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
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-tarjeta)',
          width: 'min(980px, 100%)',
          height: 'min(800px, 90vh)',
          maxHeight: '90vh',
          padding: '24px 28px',
          borderRadius: '16px',
          border: '1px solid var(--borde-input)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)',
          color: 'var(--texto-principal)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          gap: '16px',
          boxSizing: 'border-box'
        }}
      >
        {/* Encabezado fijo */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--borde-input)',
          paddingBottom: '14px',
          flexShrink: 0
        }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
              Auditoría de Inventario
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>
                Historial de Movimientos de Stock
              </h3>
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--azul-oscuro)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '700'
              }}>
                {movimientos.length} registros
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              color: 'var(--texto-mutado)',
              padding: '4px 8px',
              borderRadius: '6px',
              lineHeight: 1
            }}
            title="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          flexShrink: 0
        }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Buscar por artículo, motivo, notas o usuario..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                fontSize: '0.85rem',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setFiltroTipo('TODOS')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                border: '1px solid',
                borderColor: filtroTipo === 'TODOS' ? 'var(--azul-oscuro)' : 'var(--borde-input)',
                backgroundColor: filtroTipo === 'TODOS' ? 'var(--azul-oscuro)' : 'var(--bg-tarjeta)',
                color: filtroTipo === 'TODOS' ? '#ffffff' : 'var(--texto-mutado)',
                cursor: 'pointer'
              }}
            >
              Todos ({movimientos.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('INGRESO')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                border: '1px solid',
                borderColor: filtroTipo === 'INGRESO' ? '#16a34a' : 'var(--borde-input)',
                backgroundColor: filtroTipo === 'INGRESO' ? 'rgba(22, 163, 74, 0.12)' : 'var(--bg-tarjeta)',
                color: filtroTipo === 'INGRESO' ? '#16a34a' : 'var(--texto-mutado)',
                cursor: 'pointer'
              }}
            >
              Ingresos ({conteoIngresos})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('EGRESO')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                border: '1px solid',
                borderColor: filtroTipo === 'EGRESO' ? '#dc2626' : 'var(--borde-input)',
                backgroundColor: filtroTipo === 'EGRESO' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-tarjeta)',
                color: filtroTipo === 'EGRESO' ? '#dc2626' : 'var(--texto-mutado)',
                cursor: 'pointer'
              }}
            >
              Egresos ({conteoEgresos})
            </button>
          </div>
        </div>

        {/* Contenido / Tabla con scroll vertical independiente y encabezado sticky */}
        <div style={{
          flex: 1,
          minHeight: 0,
          border: '1px solid var(--borde-input)',
          borderRadius: '10px',
          overflowY: 'auto',
          overflowX: 'auto',
          backgroundColor: 'var(--bg-tarjeta)'
        }}>
          {cargando ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
              Cargando historial de movimientos...
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-principal)',
              color: 'var(--texto-mutado)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span style={{ fontWeight: '600', color: 'var(--texto-principal)' }}>
                {busqueda || filtroTipo !== 'TODOS'
                  ? 'No se encontraron movimientos con los filtros aplicados.'
                  : 'No se han registrado movimientos de inventario aún.'}
              </span>
              {(busqueda || filtroTipo !== 'TODOS') && (
                <button
                  type="button"
                  onClick={() => { setBusqueda(''); setFiltroTipo('TODOS'); }}
                  style={{
                    marginTop: '8px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--borde-input)',
                    backgroundColor: 'var(--bg-tarjeta)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: 'var(--texto-mutado)'
                  }}
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid var(--borde-input)'
                }}>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem', backgroundColor: '#f8fafc' }}>
                    Fecha / Hora
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem', backgroundColor: '#f8fafc' }}>
                    Artículo
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                    Tipo
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                    Cantidad
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem', backgroundColor: '#f8fafc' }}>
                    Motivo
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontSize: '0.75rem', backgroundColor: '#f8fafc' }}>
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.map(m => {
                  const esIngreso = m.tipo_movimiento === 'INGRESO';
                  return (
                    <tr
                      key={m.id_movimiento}
                      style={{
                        borderBottom: '1px solid var(--borde-input)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.6)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px', color: 'var(--texto-mutado)', whiteSpace: 'nowrap' }}>
                        {formatearFechaHora(m.created_at, 'N/D', { dateStyle: 'short', timeStyle: 'short' })}
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
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', fontSize: '0.95rem', color: esIngreso ? '#16a34a' : '#dc2626' }}>
                        {esIngreso ? `+${m.cantidad}` : `-${m.cantidad}`}
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
          )}
        </div>

        {/* Pie fijo */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '8px',
          borderTop: '1px solid var(--borde-input)',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)' }}>
            Mostrando {movimientosFiltrados.length} de {movimientos.length} movimientos
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 22px',
              backgroundColor: 'var(--azul-oscuro)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.88rem',
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
