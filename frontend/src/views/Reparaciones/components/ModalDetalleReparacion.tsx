import type { Reparacion, Producto, DetalleReparacionItem } from '../types';

interface ModalDetalleReparacionProps {
  mostrar: boolean;
  onCerrar: () => void;
  ordenDetalle: Reparacion | null;
  repuestosUtilizados: DetalleReparacionItem[];
  cargandoRepuestos: boolean;
  repuestosDisponibles: Producto[];
  repuestoSeleccionadoId: number;
  setRepuestoSeleccionadoId: (id: number) => void;
  cantidadRepuesto: number | string;
  setCantidadRepuesto: (cant: number | string) => void;
  productoRepuestoSeleccionado: Producto | undefined;
  guardandoRepuesto: boolean;
  totalRepuestosCosto: number;
  onAgregarRepuesto: (e: React.FormEvent) => void;
  onEliminarRepuesto: (idDetalle: number) => void;
}

export function ModalDetalleReparacion({
  mostrar,
  onCerrar,
  ordenDetalle,
  repuestosUtilizados,
  cargandoRepuestos,
  repuestosDisponibles,
  repuestoSeleccionadoId,
  setRepuestoSeleccionadoId,
  cantidadRepuesto,
  setCantidadRepuesto,
  productoRepuestoSeleccionado,
  guardandoRepuesto,
  totalRepuestosCosto,
  onAgregarRepuesto,
  onEliminarRepuesto
}: ModalDetalleReparacionProps) {
  if (!mostrar || !ordenDetalle) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
    }}>
      <div className="imprimible" style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '740px', padding: '28px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
        color: 'var(--texto-principal)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--borde-input)', paddingBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
              Detalle de Reparación
            </span>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '1.5rem', fontWeight: '800' }}>
              Orden #{ordenDetalle.id_reparacion} — {ordenDetalle.marca} {ordenDetalle.modelo}
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
              Dueño: {ordenDetalle.cliente_apellido}, {ordenDetalle.cliente_nombre} | Estado: <strong>{ordenDetalle.estado}</strong>
            </span>
          </div>

          <div>
            <button
              type="button"
              onClick={onCerrar}
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* DESCRIPCIÓN DEL TRABAJO */}
        <div style={{ margin: '16px 0', padding: '12px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Diagnóstico / Tareas:</span>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem' }}>{ordenDetalle.descripcion}</p>
        </div>

        {/* SECCIÓN DE REPUESTOS ASIGNADOS */}
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '700' }}>Repuestos y Componentes Utilizados</h4>

          {/* Form para agregar repuesto (Oculto al imprimir y deshabilitado si ya fue entregada) */}
          {ordenDetalle.estado !== 'Entregada' && (
            <form className="no-imprimir" onSubmit={onAgregarRepuesto} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr auto', gap: '8px', marginBottom: '14px' }}>
              <select
                value={repuestoSeleccionadoId}
                onChange={e => setRepuestoSeleccionadoId(Number(e.target.value))}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.88rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
              >
                <option value={0}>-- Seleccionar repuesto del inventario --</option>
                {repuestosDisponibles.map(p => (
                  <option key={p.id_producto} value={p.id_producto} disabled={Number(p.cantidad) <= 0}>
                    {p.nombre} {p.marca ? `(${p.marca})` : ''} - ${Number(p.precio).toLocaleString()} [Stock: {p.cantidad}]
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                max={productoRepuestoSeleccionado?.cantidad || 99}
                value={cantidadRepuesto}
                onChange={e => setCantidadRepuesto(e.target.value)}
                placeholder="Cant."
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.88rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
              />

              <button
                type="submit"
                disabled={guardandoRepuesto || repuestoSeleccionadoId === 0}
                style={{
                  backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 16px',
                  borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', cursor: guardandoRepuesto ? 'not-allowed' : 'pointer'
                }}
              >
                {guardandoRepuesto ? 'Sumando...' : 'Asignar Repuesto'}
              </button>
            </form>
          )}

          {/* Tabla de repuestos de la orden */}
          <div style={{ border: '1px solid var(--borde-input)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '8px 12px', color: 'var(--texto-mutado)' }}>Repuesto</th>
                  <th style={{ padding: '8px 12px', color: 'var(--texto-mutado)', textAlign: 'center' }}>Cant.</th>
                  <th style={{ padding: '8px 12px', color: 'var(--texto-mutado)', textAlign: 'right' }}>Precio Unit.</th>
                  <th style={{ padding: '8px 12px', color: 'var(--texto-mutado)', textAlign: 'right' }}>Subtotal</th>
                  {ordenDetalle.estado !== 'Entregada' && (
                    <th className="no-imprimir" style={{ padding: '8px 12px', color: 'var(--texto-mutado)', textAlign: 'center', width: '40px' }}></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {cargandoRepuestos ? (
                  <tr>
                    <td colSpan={ordenDetalle.estado !== 'Entregada' ? 5 : 4} style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)' }}>Cargando repuestos...</td>
                  </tr>
                ) : repuestosUtilizados.length === 0 ? (
                  <tr>
                    <td colSpan={ordenDetalle.estado !== 'Entregada' ? 5 : 4} style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                      No se han registrado repuestos utilizados en esta orden aún.
                    </td>
                  </tr>
                ) : (
                  repuestosUtilizados.map((item, idx) => (
                    <tr key={item.id_detalle_rep || idx} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>
                        {item.nombre} {item.marca ? `(${item.marca})` : ''}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600' }}>{item.cantidad}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>${Number(item.precio_unitario).toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>${Number(item.costo_total).toLocaleString()}</td>
                      {ordenDetalle.estado !== 'Entregada' && (
                        <td className="no-imprimir" style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {item.id_detalle_rep && (
                            <button
                              type="button"
                              onClick={() => onEliminarRepuesto(item.id_detalle_rep!)}
                              title="Retirar repuesto de la orden"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RESUMEN DE LIQUIDACIÓN */}
        <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '2px solid var(--borde-input)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
          <div style={{ padding: '10px', backgroundColor: 'var(--bg-principal)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>Mano de Obra</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
              ${Number(ordenDetalle.costo_mano_obra || 0).toLocaleString()}
            </div>
          </div>

          <div style={{ padding: '10px', backgroundColor: 'var(--bg-principal)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>Total Repuestos</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2563eb' }}>
              ${totalRepuestosCosto.toLocaleString()}
            </div>
          </div>

          <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '700' }}>Total Liquidación</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>
              ${Number(ordenDetalle.costo_total || (Number(ordenDetalle.costo_mano_obra || 0) + totalRepuestosCosto)).toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onCerrar}
            style={{ padding: '10px 22px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
