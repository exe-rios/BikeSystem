import type { Producto } from '../../../types';

interface StockTablaProps {
  productos: Producto[];
  cargando: boolean;
  onEditar: (p: Producto) => void;
  onEliminar: (id: number, nombre: string) => void;
  onReactivar: (id: number, nombre: string) => void;
}

export function StockTabla({
  productos,
  cargando,
  onEditar,
  onEliminar,
  onReactivar
}: StockTablaProps) {
  const getBadgeDisponibilidad = (p: Producto) => {
    const estado = p.estado_stock || 'optimo';

    if (estado === 'sin_stock') {
      return {
        label: 'Agotado',
        bg: '#fee2e2',
        color: '#991b1b',
        border: '#fca5a5'
      };
    }
    if (estado === 'bajo_stock') {
      return {
        label: 'Reabastecer',
        bg: '#fff7ed',
        color: '#c2410c',
        border: '#fdba74'
      };
    }
    return {
      label: 'Óptimo',
      bg: '#ecfdf5',
      color: '#065f46',
      border: '#a7f3d0'
    };
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-tarjeta)',
      border: '1px solid var(--borde-input)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-principal)', borderBottom: '1px solid var(--borde-input)' }}>
            <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              Artículo / Especificaciones
            </th>
            <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              Categoría
            </th>
            <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              Precio Venta
            </th>
            <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'center' }}>
              Stock / Mínimo
            </th>
            <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'center' }}>
              Disponibilidad
            </th>
            <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>
              <div style={{ display: 'inline-block', width: '122px', textAlign: 'center' }}>
                Acciones
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr>
              <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                Cargando inventario...
              </td>
            </tr>
          ) : productos.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                No se encontraron artículos con los filtros aplicados.
              </td>
            </tr>
          ) : (
            productos.map(p => {
              const esActivo = p.activo !== false;
              const badge = getBadgeDisponibilidad(p);
              const cant = Number(p.cantidad) || 0;
              const min = Number(p.stock_minimo) || 0;

              return (
                <tr
                  key={p.id_producto}
                  style={{
                    borderBottom: '1px solid var(--borde-input)',
                    backgroundColor: !esActivo ? 'rgba(148, 163, 184, 0.05)' : 'transparent',
                    opacity: !esActivo ? 0.75 : 1
                  }}
                >
                  {/* Artículo */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', color: esActivo ? 'var(--texto-principal)' : 'var(--texto-mutado)', fontSize: '0.92rem' }}>
                        {p.nombre}
                      </span>
                      {!esActivo && (
                        <span style={{ fontSize: '0.68rem', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          Inactivo
                        </span>
                      )}
                    </div>

                    {(p.marca || p.modelo) && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)', marginTop: '2px' }}>
                        {p.marca} {p.modelo}
                      </div>
                    )}

                    {p.tipo_prod === 'bicicleta' && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--azul-oscuro)', marginTop: '3px', fontWeight: '600' }}>
                        {p.rodado ? `Rodado ${p.rodado}` : ''} {p.talle ? `• Talle ${p.talle}` : ''} {p.color ? `• Color ${p.color}` : ''}
                      </div>
                    )}
                  </td>

                  {/* Categoría */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      textTransform: 'capitalize',
                      backgroundColor: p.tipo_prod === 'bicicleta' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-principal)',
                      color: p.tipo_prod === 'bicicleta' ? 'var(--azul-oscuro)' : 'var(--texto-principal)'
                    }}>
                      {p.tipo_prod}
                    </span>
                  </td>

                  {/* Precio */}
                  <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--texto-principal)', fontSize: '0.92rem' }}>
                    ${Number(p.precio || 0).toLocaleString()}
                  </td>

                  {/* Stock Actual / Mínimo */}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: cant <= min ? '#dc2626' : 'var(--texto-principal)' }}>
                      {cant}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)', marginLeft: '4px' }}>
                      / mín {min}
                    </span>
                  </td>

                  {/* Disponibilidad */}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}>
                      {badge.label}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {esActivo ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditar(p)}
                            style={{
                              backgroundColor: 'rgba(37, 99, 235, 0.08)',
                              color: 'var(--azul-oscuro)',
                              border: '1px solid rgba(37, 99, 235, 0.2)',
                              borderRadius: '6px',
                              padding: '5px 0',
                              width: '58px',
                              textAlign: 'center',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => p.id_producto && onEliminar(p.id_producto, p.nombre)}
                            style={{
                              backgroundColor: 'rgba(37, 99, 235, 0.08)',
                              color: 'var(--azul-oscuro)',
                              border: '1px solid rgba(37, 99, 235, 0.2)',
                              borderRadius: '6px',
                              padding: '5px 0',
                              width: '58px',
                              textAlign: 'center',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Baja
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => p.id_producto && onReactivar(p.id_producto, p.nombre)}
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            color: '#059669',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '6px',
                            padding: '5px 0',
                            width: '122px',
                            textAlign: 'center',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
