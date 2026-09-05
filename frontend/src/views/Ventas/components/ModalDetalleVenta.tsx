import { useState } from 'react';
import type { VentaDetallada } from '../types';

interface ModalDetalleVentaProps {
  ventaSeleccionada: VentaDetallada | null;
  cargandoDetalle: boolean;
  anulando: boolean;
  onAnularVenta: (idVenta: number, motivo?: string) => void;
  onClose: () => void;
}

export function ModalDetalleVenta({
  ventaSeleccionada,
  cargandoDetalle,
  anulando,
  onAnularVenta,
  onClose
}: ModalDetalleVentaProps) {
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [motivoInput, setMotivoInput] = useState('');
  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
    }}>
      <div className="imprimible" style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '720px', padding: '30px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
        color: 'var(--texto-principal)'
      }}>
        {cargandoDetalle || !ventaSeleccionada ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
            Cargando comprobante de venta...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* MEMBRETE EXCLUSIVO PARA IMPRESIÓN */}
            <div className="imprimir-membrete">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>BIKESYSTEM</h1>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#444' }}>Venta de Bicicletas, Repuestos y Taller Especializado</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'monospace' }}>COMPROBANTE DE VENTA NO VÁLIDO COMO FACTURA</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                    FAC-{String(ventaSeleccionada.venta.id_venta).padStart(6, '0')} &bull; Pago: {ventaSeleccionada.venta.metodo_pago_nombre || 'Efectivo'}
                  </p>
                </div>
              </div>
            </div>

            {/* Cabecera del Comprobante */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--borde-input)', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: ventaSeleccionada.venta.estado === 'ANULADA' ? '#dc2626' : '#16a34a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {ventaSeleccionada.venta.estado === 'ANULADA' ? 'Comprobante Anulado' : 'Comprobante de Venta Emitido'}
                  </span>
                  <span style={{
                    backgroundColor: ventaSeleccionada.venta.estado === 'ANULADA' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(22, 163, 74, 0.12)',
                    color: ventaSeleccionada.venta.estado === 'ANULADA' ? '#dc2626' : '#16a34a',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: '800'
                  }}>
                    {ventaSeleccionada.venta.estado === 'ANULADA' ? 'ANULADA' : 'COMPLETADA'}
                  </span>
                </div>
                <h2 style={{ margin: '2px 0', fontSize: '1.6rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--azul-oscuro)' }}>
                  FAC-{String(ventaSeleccionada.venta.id_venta).padStart(6, '0')}
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                  Fecha: {ventaSeleccionada.venta.fecha ? new Date(ventaSeleccionada.venta.fecha).toLocaleDateString() : 'Hoy'}
                </span>
              </div>

              <div className="no-imprimir" style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                    backgroundColor: 'var(--bg-principal)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600'
                  }}
                >
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texto-mutado)', padding: '0 4px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Datos del Cliente y Vendedor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: 'var(--bg-principal)', padding: '16px', borderRadius: '10px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Cliente Comprador</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: '700', fontSize: '1rem', color: 'var(--texto-principal)' }}>
                  {ventaSeleccionada.venta.cliente_nombre} {ventaSeleccionada.venta.cliente_apellido}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                  DNI: {ventaSeleccionada.venta.cliente_dni || 'No registrado'}
                </p>
                {ventaSeleccionada.venta.cliente_telefono && (
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                    Tel: {ventaSeleccionada.venta.cliente_telefono}
                  </p>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Información de la Operación</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--texto-principal)' }}>
                  <strong>Vendedor:</strong> {ventaSeleccionada.venta.vendedor || 'Sistema'}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                  Método de Pago: <strong style={{ color: 'var(--texto-principal)' }}>{ventaSeleccionada.venta.metodo_pago_nombre || 'Efectivo'}</strong>
                </p>
              </div>
            </div>

            {/* Tabla de Artículos Facturados */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
                Artículos y Productos ({(ventaSeleccionada.productos_vendidos || []).length})
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--borde-input)', color: 'var(--texto-mutado)' }}>
                    <th style={{ padding: '8px 0' }}>Descripción</th>
                    <th style={{ padding: '8px 0', textAlign: 'center' }}>Cant.</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Precio Unit.</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(ventaSeleccionada.productos_vendidos || []).map((prod, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                      <td style={{ padding: '10px 0' }}>
                        <span style={{ fontWeight: '600' }}>{prod.nombre}</span>
                        {(prod.marca || prod.modelo) && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>
                            {prod.marca} {prod.modelo}
                          </div>
                        )}
                        {prod.tipo_prod === 'bicicleta' && (
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontFamily: 'monospace', fontWeight: '600' }}>
                            Detalles: {prod.rodado ? `(R${prod.rodado})` : ''} {prod.talle ? `[${prod.talle}]` : ''} {prod.color ? `- ${prod.color}` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'center', fontWeight: '600' }}>
                        {prod.cantidad}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        ${Number(prod.precio_unitario).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '700' }}>
                        ${Number(prod.costo_total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Final */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '2px solid var(--borde-input)' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--texto-mutado)' }}>Total:</span>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--texto-principal)' }}>
                ${Number(ventaSeleccionada.venta.costo_total).toLocaleString()}
              </span>
            </div>

            {/* PIE DE PÁGINA IMPRESIÓN */}
            <div className="imprimir-membrete" style={{ marginTop: '16px', paddingTop: '12px', fontSize: '0.8rem', borderTop: '1px dashed #666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Garantía:</strong> 30 días corridos a partir de la fecha de entrega en bicicletas nuevas y cuadros.<br />
                ¡Gracias por elegir <strong>BIKESYSTEM</strong>!
              </div>
              <div style={{ textAlign: 'center', width: '220px', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '24px' }}>
                Firma / Conformidad
              </div>
            </div>

            {/* BANNER SI LA VENTA FUE ANULADA */}
            {ventaSeleccionada.venta.estado === 'ANULADA' && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '0.88rem'
              }}>
                <strong>⚠️ Esta venta fue anulada:</strong> {ventaSeleccionada.venta.motivo_anulacion || 'Sin motivo especificado'}.
                {ventaSeleccionada.venta.fecha_anulacion && (
                  <div style={{ fontSize: '0.78rem', color: '#991b1b', marginTop: '4px' }}>
                    Fecha: {new Date(ventaSeleccionada.venta.fecha_anulacion).toLocaleString()} — Stock de los productos repuesto al inventario.
                  </div>
                )}
              </div>
            )}

            <div className="no-imprimir" style={{ marginTop: '8px' }}>
              {ventaSeleccionada.venta.estado !== 'ANULADA' && !mostrarConfirmacion && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmacion(true)}
                    disabled={anulando}
                    style={{
                      padding: '10px 18px',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      color: '#dc2626',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: anulando ? 0.6 : 1
                    }}
                  >
                    <span>⚠️ Anular Venta y Reponer Stock</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '10px 24px', backgroundColor: 'var(--azul-oscuro)', color: '#fff',
                      border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              )}

              {ventaSeleccionada.venta.estado !== 'ANULADA' && mostrarConfirmacion && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div>
                    <strong style={{ color: '#dc2626', fontSize: '0.95rem' }}>
                      ¿Confirmas la anulación de la venta FAC-{String(ventaSeleccionada.venta.id_venta).padStart(6, '0')}?
                    </strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--texto-mutado)' }}>
                      Esta acción revertirá la venta, repondrá las unidades de los artículos al stock y dejará constancia en la bitácora.
                    </p>
                  </div>

                  <input
                    type="text"
                    value={motivoInput}
                    onChange={e => setMotivoInput(e.target.value)}
                    placeholder="Ingresa el motivo de anulación (ej. Error de facturación, devolución del cliente...)"
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--borde-input)',
                      fontSize: '0.88rem',
                      backgroundColor: 'var(--bg-principal)',
                      color: 'var(--texto-principal)'
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmacion(false)}
                      disabled={anulando}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--borde-input)',
                        backgroundColor: 'transparent',
                        color: 'var(--texto-principal)',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (ventaSeleccionada.venta.id_venta) {
                          onAnularVenta(ventaSeleccionada.venta.id_venta, motivoInput);
                        }
                      }}
                      disabled={anulando}
                      style={{
                        padding: '8px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        opacity: anulando ? 0.6 : 1
                      }}
                    >
                      {anulando ? 'Anulando...' : 'Confirmar Anulación'}
                    </button>
                  </div>
                </div>
              )}

              {ventaSeleccionada.venta.estado === 'ANULADA' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '10px 24px', backgroundColor: 'var(--azul-oscuro)', color: '#fff',
                      border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
