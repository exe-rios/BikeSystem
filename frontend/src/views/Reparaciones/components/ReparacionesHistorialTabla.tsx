import type { Reparacion } from '../types';

interface ReparacionesHistorialTablaProps {
  reparacionesEntregadas: Reparacion[];
  reparacionesEntregadasFiltradas: Reparacion[];
  totalMontoHistorico: number;
  promedioPorOrden: number;
  busquedaHistorial: string;
  setBusquedaHistorial: (v: string) => void;
  cargando: boolean;
  handleAbrirDetalle: (rep: Reparacion) => void;
  setOrdenEditando: (rep: Reparacion) => void;
  setMostrarModalEditar: (v: boolean) => void;
  handleReabrirOrden: (id: number) => void;
}

export function ReparacionesHistorialTabla({
  reparacionesEntregadas,
  reparacionesEntregadasFiltradas,
  totalMontoHistorico,
  promedioPorOrden,
  busquedaHistorial,
  setBusquedaHistorial,
  cargando,
  handleAbrirDetalle,
  setOrdenEditando,
  setMostrarModalEditar,
  handleReabrirOrden
}: ReparacionesHistorialTablaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* TARJETAS RESUMEN DE HISTORIAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--borde-input)' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Órdenes Entregadas</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--texto-principal)', marginTop: '4px' }}>
            {reparacionesEntregadas.length}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--borde-input)' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Facturación Total Taller</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--texto-principal)', marginTop: '4px' }}>
            ${totalMontoHistorico.toLocaleString()}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--borde-input)' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Promedio por ingresos</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--azul-oscuro)', marginTop: '4px' }}>
            ${Math.round(promedioPorOrden).toLocaleString()}
          </div>
        </div>
      </div>

      {/* BUSCADOR DE HISTORIAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
          Listado completo de trabajos entregados.
        </span>

        <input
          type="text"
          placeholder="Buscar por orden #, cliente, bicicleta, diagnóstico..."
          value={busquedaHistorial}
          onChange={e => setBusquedaHistorial(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)',
            color: 'var(--texto-principal)',
            width: '380px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* TABLA DE HISTORIAL */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        borderRadius: '14px',
        border: '1px solid var(--borde-input)',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead style={{ backgroundColor: 'var(--bg-principal)', borderBottom: '1px solid var(--borde-input)' }}>
            <tr>
              <th style={{ padding: '14px 16px', color: 'var(--texto-mutado)', fontWeight: '700' }}># Orden</th>
              <th style={{ padding: '14px 16px', color: 'var(--texto-mutado)', fontWeight: '700' }}>Fechas (Ing./Entr.)</th>
              <th style={{ padding: '14px 16px', color: 'var(--texto-mutado)', fontWeight: '700' }}>Cliente</th>
              <th style={{ padding: '14px 16px', color: 'var(--texto-mutado)', fontWeight: '700' }}>Bicicleta</th>
              <th style={{ padding: '14px 16px', color: 'var(--texto-mutado)', fontWeight: '700' }}>Trabajo Realizado</th>
              <th style={{ padding: '14px 16px', color: 'var(--texto-mutado)', fontWeight: '700', textAlign: 'right' }}>M. de Obra</th>
              <th style={{ padding: '14px 16px', color: 'var(--texto-mutado)', fontWeight: '700', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '14px 16px', color: 'var(--texto-mutado)', fontWeight: '700', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando historial...
                </td>
              </tr>
            ) : reparacionesEntregadasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  {reparacionesEntregadas.length === 0
                    ? 'No hay órdenes entregadas registradas aún.'
                    : 'No se encontraron órdenes entregadas que coincidan con la búsqueda.'}
                </td>
              </tr>
            ) : (
              reparacionesEntregadasFiltradas.map(rep => {
                const montoTotal = Number(rep.costo_total || rep.costo_mano_obra || 0);
                const fechaIngresoStr = rep.fecha_ingreso ? new Date(rep.fecha_ingreso).toLocaleDateString() : '-';
                const fechaEgresoStr = rep.fecha_egreso ? new Date(rep.fecha_egreso).toLocaleDateString() : 'Entregada';

                return (
                  <tr
                    key={rep.id_reparacion}
                    style={{ borderBottom: '1px solid var(--borde-input)', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.02)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--azul-oscuro)' }}>
                      ORD-{String(rep.id_reparacion).padStart(5, '0')}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                      <div style={{ color: 'var(--texto-principal)', fontWeight: '600' }}>Ent: {fechaEgresoStr}</div>
                      <div style={{ color: 'var(--texto-mutado)', fontSize: '0.78rem' }}>Ing: {fechaIngresoStr}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--texto-principal)' }}>
                      {rep.cliente_apellido}, {rep.cliente_nombre}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--texto-principal)' }}>
                      {rep.marca} {rep.modelo}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--texto-mutado)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rep.descripcion}>
                      {rep.descripcion}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--texto-principal)' }}>
                      ${Number(rep.costo_mano_obra || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '800', color: 'var(--texto-mutado)', fontSize: '1rem' }}>
                      ${montoTotal.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleAbrirDetalle(rep)}
                          title="Ver detalle de la orden y repuestos"
                          style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            color: 'var(--azul-oscuro)',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          Detalle
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOrdenEditando(rep);
                            setMostrarModalEditar(true);
                          }}
                          title="Editar orden"
                          style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            color: 'var(--azul-oscuro)',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => rep.id_reparacion && handleReabrirOrden(rep.id_reparacion)}
                          title="Reabrir orden y devolver al taller activo"
                          style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            color: 'var(--azul-oscuro)',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          Volver al taller
                        </button>
                      </div>
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
