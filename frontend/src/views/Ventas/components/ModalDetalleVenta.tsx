import { useState } from 'react';
import type { VentaDetallada } from '../types';
import { formatearMoneda, formatearFecha, formatearFechaHora } from '../../../utils/formatters';
import { generarPDFVenta } from '../../../utils/generarPDFVenta';
import { usePermisos } from '../../../hooks/usePermisos';

interface ModalDetalleVentaProps {
  ventaSeleccionada: VentaDetallada | null;
  cargandoDetalle: boolean;
  anulando: boolean;
  onAnularVenta: (idVenta: number, motivo?: string) => void;
  onClose: () => void;
}

/** Modal de visualización de comprobante fiscal, ítems vendidos y anulación de venta. */
export function ModalDetalleVenta({
  ventaSeleccionada,
  cargandoDetalle,
  anulando,
  onAnularVenta,
  onClose
}: ModalDetalleVentaProps) {
  const { esAdmin } = usePermisos();
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [motivoInput, setMotivoInput] = useState('');

  const handleClose = () => {
    if (mostrarConfirmacion && motivoInput.trim()) {
      if (!window.confirm('¿Deseas descartar el motivo de anulación y cerrar?')) return;
    }
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
      }}
    >
      <div className="imprimible" style={{
        backgroundColor: 'var(--bg-tarjeta)', width: 'min(794px, 95vw)', padding: '32px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
        color: 'var(--texto-principal)'
      }}>
        {cargandoDetalle || !ventaSeleccionada ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
            Cargando comprobante de venta...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* MEMBRETE EXCLUSIVO PARA IMPRESIÓN (A4 limpio estilo PDF) */}
            <div className="imprimir-membrete">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
                    DN BIKES
                  </h1>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#475569' }}>
                    Venta de Bicicletas, Repuestos y Taller Especializado
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Esperanza, Santa Fe, Argentina | Tel: 3496-412345
                  </p>
                </div>

                <div style={{
                  textAlign: 'left',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  minWidth: '240px'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                    COMPROBANTE DE VENTA
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#475569', marginTop: '2px' }}>
                    NO VÁLIDO COMO FACTURA
                  </div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    fontFamily: 'monospace',
                    color: ventaSeleccionada.venta.estado === 'ANULADA' ? '#dc2626' : '#0f172a',
                    marginTop: '4px'
                  }}>
                    FAC-{String(ventaSeleccionada.venta.id_venta).padStart(6, '0')}
                    {ventaSeleccionada.venta.estado === 'ANULADA' ? ' (ANULADA)' : ''}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}>
                    Fecha: {formatearFecha(ventaSeleccionada.venta.fecha, 'Hoy')} &bull; Pago: {ventaSeleccionada.venta.metodo_pago_nombre || 'Efectivo'}
                  </div>
                </div>
              </div>
            </div>

            {/* Cabecera del Comprobante (solo pantalla) */}
            <div className="no-imprimir" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--borde-input)', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.78rem',
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
                  <span style={{
                    backgroundColor: 'var(--bg-principal)',
                    color: 'var(--texto-mutado)',
                    border: '1px solid var(--borde-input)',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    fontWeight: '700'
                  }}>
                    No Válido como Factura
                  </span>
                </div>
                <h2 style={{ margin: '2px 0', fontSize: '1.6rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--azul-oscuro)' }}>
                  FAC-{String(ventaSeleccionada.venta.id_venta).padStart(6, '0')}
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                  Fecha: {formatearFecha(ventaSeleccionada.venta.fecha, 'Hoy')}
                </span>
              </div>

              <div className="no-imprimir" style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => generarPDFVenta(ventaSeleccionada)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--azul-oscuro)',
                    backgroundColor: 'var(--azul-oscuro)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                    backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600'
                  }}
                >
                  Imprimir
                </button>
              </div>
            </div>

            {/* Datos del Cliente y de la Operación */}
            {(() => {
              const esConsumidorFinal = 
                ventaSeleccionada.venta.es_consumidor_final ||
                (ventaSeleccionada.venta.cliente_nombre?.toLowerCase().trim() === 'consumidor' && ventaSeleccionada.venta.cliente_apellido?.toLowerCase().trim() === 'final') ||
                (ventaSeleccionada.venta.cliente_nombre?.toLowerCase().trim() === 'final' && ventaSeleccionada.venta.cliente_apellido?.toLowerCase().trim() === 'consumidor') ||
                ventaSeleccionada.venta.cliente_direccion?.toLowerCase().includes('mostrador');

              const tieneNombrePersonalizado = 
                esConsumidorFinal && 
                ventaSeleccionada.venta.cliente_nombre && 
                ventaSeleccionada.venta.cliente_nombre.toLowerCase().trim() !== 'consumidor';

              const nombreClienteMostrar = tieneNombrePersonalizado
                ? `${ventaSeleccionada.venta.cliente_nombre} ${ventaSeleccionada.venta.cliente_apellido || ''} (Consumidor Final)`
                : esConsumidorFinal
                ? 'Consumidor Final (Venta Mostrador)'
                : `${ventaSeleccionada.venta.cliente_nombre} ${ventaSeleccionada.venta.cliente_apellido || ''}`;

              const dniMostrar = esConsumidorFinal
                ? (ventaSeleccionada.venta.cliente_dni ? ventaSeleccionada.venta.cliente_dni : 'S/DNI')
                : (ventaSeleccionada.venta.cliente_dni || 'S/DNI');

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f1f5f9', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '0.73rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Cliente Comprador</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: '700', fontSize: '0.98rem', color: '#0f172a' }}>
                      {nombreClienteMostrar}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#475569' }}>
                      DNI: {dniMostrar}
                      {!esConsumidorFinal && ventaSeleccionada.venta.cliente_telefono ? `  |  Tel: ${ventaSeleccionada.venta.cliente_telefono}` : ''}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.73rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Datos de Operación</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#0f172a' }}>
                      Medio de Pago: <strong>{ventaSeleccionada.venta.metodo_pago_nombre || 'Efectivo'}</strong>
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.83rem', color: '#475569' }}>
                      Fecha y Hora: {formatearFechaHora(ventaSeleccionada.venta.fecha)}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Tabla de Artículos Facturados (sin cuadrículas negras) */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.84rem', color: '#475569', textTransform: 'uppercase' }}>
                Artículos y Productos ({(ventaSeleccionada.productos_vendidos || []).length})
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '36px' }}>#</th>
                    <th style={{ padding: '9px 10px' }}>Descripción</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '60px' }}>Cant.</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', width: '110px' }}>Precio Unit.</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', width: '115px' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(ventaSeleccionada.productos_vendidos || []).map((prod, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{prod.nombre}</span>
                        {(prod.marca || prod.modelo) && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {prod.marca} {prod.modelo}
                          </div>
                        )}
                        {prod.tipo_prod === 'bicicleta' && (
                          <div style={{ fontSize: '0.74rem', color: '#334155', fontWeight: '600', marginTop: '2px' }}>
                            {[
                              prod.genero ? prod.genero.charAt(0).toUpperCase() + prod.genero.slice(1) : null,
                              prod.rodado ? `Rod. ${prod.rodado}` : null,
                              prod.talle ? `Talle ${prod.talle}` : null,
                              prod.color ? prod.color : null
                            ].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '600', color: '#0f172a' }}>
                        {prod.cantidad}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#334155' }}>
                        {formatearMoneda(prod.precio_unitario)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                        {formatearMoneda(prod.costo_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Final alineado a la derecha */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '10px 18px',
                minWidth: '260px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '20px'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Total Facturado
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                  {formatearMoneda(ventaSeleccionada.venta.costo_total)}
                </span>
              </div>
            </div>

            {/* Cláusula de Garantía Oficial cuando incluye bicicleta */}
            {(ventaSeleccionada.productos_vendidos || []).some(p => p.tipo_prod?.toLowerCase() === 'bicicleta') && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: '#78350f',
                lineHeight: 1.45
              }}>
                <strong style={{ color: '#b45309', display: 'block', marginBottom: '2px' }}>
                  CONDICIONES DE GARANTÍA OFICIAL Y PRIMER SERVICE:
                </strong>
                Las bicicletas nuevas cuentan con 6 meses de garantía oficial por defectos de fabricación. Para mantener la garantía vigente, es requisito indispensable realizar el Primer Service Gratuito de Ajuste y Calibración dentro de los 30 días posteriores a la fecha de compra en nuestro taller oficial.
              </div>
            )}

            {/* PIE DE PÁGINA IMPRESIÓN */}
            <div className="imprimir-flex" style={{ marginTop: '12px', paddingTop: '10px', fontSize: '0.78rem', borderTop: '1px solid #cbd5e1' }}>
              <div>
                <strong style={{ color: '#0f172a' }}>COMPROBANTE DE VENTA — DOCUMENTO NO VÁLIDO COMO FACTURA FISCAL</strong><br />
                <span style={{ color: '#64748b' }}>
                  Comprobante de gestión comercial interna &bull; Gracias por elegir <strong>DN BIKES</strong>.
                </span>
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
                <strong>Esta venta fue anulada:</strong> {ventaSeleccionada.venta.motivo_anulacion || 'Sin motivo especificado'}.
                {ventaSeleccionada.venta.fecha_anulacion && (
                  <div style={{ fontSize: '0.78rem', color: '#991b1b', marginTop: '4px' }}>
                    Fecha: {formatearFechaHora(ventaSeleccionada.venta.fecha_anulacion)} — Stock de los productos repuesto al inventario.
                  </div>
                )}
              </div>
            )}

            <div className="no-imprimir" style={{ marginTop: '8px' }}>
              {ventaSeleccionada.venta.estado !== 'ANULADA' && !mostrarConfirmacion && (
                <div style={{ display: 'flex', justifyContent: esAdmin ? 'space-between' : 'flex-end', alignItems: 'center' }}>
                  {esAdmin && (
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
                      <span>Anular Venta y Reponer Stock</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClose}
                    style={{
                      padding: '10px 24px', backgroundColor: 'transparent', color: 'var(--texto-principal)',
                      border: '1px solid var(--borde-input)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              )}

              {esAdmin && ventaSeleccionada.venta.estado !== 'ANULADA' && mostrarConfirmacion && (
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: motivoInput.length >= 250 ? '#ef4444' : 'var(--texto-mutado)' }}>
                      {motivoInput.length}/250
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={250}
                    value={motivoInput}
                    onChange={e => setMotivoInput(e.target.value.slice(0, 250))}
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleClose}
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
