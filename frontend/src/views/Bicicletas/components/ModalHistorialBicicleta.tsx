import type { FichaHistorialBicicleta } from '../types';

interface ModalHistorialBicicletaProps {
  mostrar: boolean;
  onCerrar: () => void;
  cargandoHistorial: boolean;
  datosHistorial: FichaHistorialBicicleta | null;
}

export function ModalHistorialBicicleta({
  mostrar,
  onCerrar,
  cargandoHistorial,
  datosHistorial
}: ModalHistorialBicicletaProps) {
  if (!mostrar) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '700px', maxHeight: '90vh', overflowY: 'auto',
        padding: '30px', borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--borde-input)', paddingBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>Ficha Técnica y Taller</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--texto-principal)', margin: '2px 0 0 0' }}>
              {datosHistorial?.bicicleta.marca} {datosHistorial?.bicicleta.modelo || ''}
            </h3>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
        </div>

        {cargandoHistorial ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--texto-mutado)' }}>Cargando ficha e historial...</div>
        ) : datosHistorial && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Datos del Propietario */}
            <div style={{ backgroundColor: 'var(--bg-principal)', padding: '16px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Propietario</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: '700', color: 'var(--texto-principal)' }}>
                  {datosHistorial.bicicleta.cliente_apellido}, {datosHistorial.bicicleta.cliente_nombre}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Contacto</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: 'var(--texto-mutado)' }}>
                  Tel: {datosHistorial.bicicleta.cliente_telefono || 'No registrado'} | DNI: {datosHistorial.bicicleta.cliente_dni || 'N/D'}
                </p>
              </div>
            </div>

            {/* Historial de Reparaciones */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                  Historial de Reparaciones y Servicios ({datosHistorial.total_reparaciones})
                </h4>
              </div>

              {datosHistorial.historial_reparaciones.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', color: 'var(--texto-mutado)', fontSize: '0.9rem' }}>
                  Esta bicicleta no registra ingresos u órdenes de trabajo en el taller.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {datosHistorial.historial_reparaciones.map((rep) => (
                    <div
                      key={rep.id_reparacion}
                      style={{
                        border: '1px solid var(--borde-input)',
                        borderRadius: '12px',
                        padding: '16px',
                        backgroundColor: 'var(--bg-tarjeta)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--azul-oscuro)', fontSize: '0.95rem' }}>
                          ORDEN #{String(rep.id_reparacion).padStart(5, '0')}
                        </span>
                        <span style={{
                          backgroundColor: rep.estado === 'Entregada' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                          color: rep.estado === 'Entregada' ? '#16a34a' : '#2563eb',
                          borderRadius: '20px',
                          padding: '2px 10px',
                          fontSize: '0.78rem',
                          fontWeight: '700'
                        }}>
                          {rep.estado}
                        </span>
                      </div>

                      <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--texto-principal)' }}>
                        <strong>Trabajo realizado / Motivo:</strong> {rep.descripcion || 'Sin descripción'}
                      </p>

                      <div style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', display: 'flex', gap: '16px', margin: '6px 0' }}>
                        <span>Ingreso: {rep.fecha_ingreso ? new Date(rep.fecha_ingreso).toLocaleDateString() : 'N/D'}</span>
                        {rep.fecha_egreso && <span>Egreso: {new Date(rep.fecha_egreso).toLocaleDateString()}</span>}
                        <span>Mecánico: {rep.mecanico || 'Taller'}</span>
                      </div>

                      {/* Repuestos Usados */}
                      {rep.repuestos_utilizados && rep.repuestos_utilizados.length > 0 && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--borde-input)', fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--texto-mutado)' }}>Repuestos utilizados:</span>
                          <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                            {rep.repuestos_utilizados.map((det, dIdx) => (
                              <li key={dIdx}>
                                {det.repuesto_nombre} ({det.cantidad} un.) — ${Number(det.costo_total).toLocaleString()}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontWeight: '800', color: '#16a34a' }}>
                        Total: ${Number(rep.costo_total).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onCerrar}
                style={{
                  padding: '10px 24px', backgroundColor: 'var(--azul-oscuro)', color: '#fff',
                  border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
