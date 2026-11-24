import { useRef, useEffect, useState, useMemo } from 'react';
import type { Reparacion, Producto, DetalleReparacionItem } from '../types';
import { formatearMoneda, formatearFecha } from '../../../utils/formatters';
import { generarPDFReparacion } from '../../../utils/generarPDFReparacion';
import { SearchableSelect, type SearchableOption } from '../../../components/SearchableSelect';

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
  mensajeRepuesto?: { texto: string; tipo: 'exito' | 'error' } | null;
  totalRepuestosCosto: number;
  onAgregarRepuesto: (e: React.FormEvent) => void;
  onEliminarRepuesto: (idDetalle: number) => void;
}

/** Modal de desglose de orden con mano de obra y consumo de repuestos en stock. */
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
  mensajeRepuesto,
  totalRepuestosCosto,
  onAgregarRepuesto,
  onEliminarRepuesto
}: ModalDetalleReparacionProps) {
  const inputRepuestoRef = useRef<HTMLInputElement>(null);
  const [filtroTipoRepuesto, setFiltroTipoRepuesto] = useState<'todos' | 'repuesto' | 'accesorio'>('todos');
  const [filtroProveedorRepuesto, setFiltroProveedorRepuesto] = useState<string>('todos');
  const [soloConStock, setSoloConStock] = useState<boolean>(true);

  const proveedoresRepuestos = useMemo(() => {
    const nombres = new Set<string>();
    for (const p of repuestosDisponibles) {
      if (p.proveedor_nombre && p.proveedor_nombre.trim()) {
        nombres.add(p.proveedor_nombre.trim());
      }
    }
    return Array.from(nombres).sort((a, b) => a.localeCompare(b));
  }, [repuestosDisponibles]);

  const opcionesRepuestos: SearchableOption[] = useMemo(() => {
    return repuestosDisponibles
      .filter(p => {
        if (soloConStock && Number(p.cantidad) <= 0) return false;
        if (filtroTipoRepuesto !== 'todos' && String(p.tipo_prod || '').toLowerCase() !== filtroTipoRepuesto) {
          return false;
        }
        if (filtroProveedorRepuesto !== 'todos' && (p.proveedor_nombre || '').trim() !== filtroProveedorRepuesto) {
          return false;
        }
        return true;
      })
      .map(p => {
        const sinStock = Number(p.cantidad) <= 0;
        const prefijo = p.codigo ? `[${p.codigo}] ` : '';
        const detalles = [p.marca, p.modelo, p.proveedor_nombre ? `Prov: ${p.proveedor_nombre}` : ''].filter(Boolean).join(' • ');
        return {
          value: p.id_producto || 0,
          label: `${prefijo}${p.nombre}`,
          sublabel: `${detalles ? `${detalles} • ` : ''}Stock: ${p.cantidad} un.${sinStock ? ' (AGOTADO)' : ''}`,
          badge: formatearMoneda(p.precio),
          searchText: `#${p.id_producto || ''} ${p.id_producto || ''} ${p.codigo || ''} ${p.nombre || ''} ${p.marca || ''} ${p.modelo || ''} ${p.proveedor_nombre || ''}`,
          disabled: sinStock
        };
      });
  }, [repuestosDisponibles, filtroTipoRepuesto, filtroProveedorRepuesto, soloConStock]);

  useEffect(() => {
    if (mensajeRepuesto?.tipo === 'exito') {
      inputRepuestoRef.current?.focus();
    }
  }, [mensajeRepuesto]);

  if (!mostrar || !ordenDetalle) return null;

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onCerrar()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
      }}
    >
      <div className="imprimible" style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '740px', padding: '28px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
        color: 'var(--texto-principal)'
      }}>
        {/* MEMBRETE EXCLUSIVO PARA IMPRESIÓN (A4 limpio estilo DN BIKES) */}
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
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'right',
              minWidth: '240px'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0f172a', letterSpacing: '0.5px' }}>
                ORDEN DE REPARACIÓN
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#475569', marginTop: '2px' }}>
                NO VÁLIDO COMO FACTURA
              </div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                fontFamily: 'monospace',
                color: '#0f172a',
                marginTop: '4px'
              }}>
                REP-{String(ordenDetalle.id_reparacion || 0).padStart(6, '0')}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}>
                Ingreso: {formatearFecha(ordenDetalle.fecha_ingreso, 'Hoy')} &bull; Estado: {ordenDetalle.estado}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>
                {ordenDetalle.cliente_apellido}, {ordenDetalle.cliente_nombre}
                {ordenDetalle.cliente_dni ? ` (DNI ${ordenDetalle.cliente_dni})` : ''} &bull; {ordenDetalle.marca || ''} {ordenDetalle.modelo || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Cabecera de pantalla */}
        <div className="no-imprimir" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--borde-input)', paddingBottom: '14px', gap: '12px' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => generarPDFReparacion(ordenDetalle, repuestosUtilizados, totalRepuestosCosto)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--azul-oscuro)',
                backgroundColor: 'var(--azul-oscuro)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.84rem',
                fontWeight: '700'
              }}
            >
              Descargar PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                cursor: 'pointer',
                fontSize: '0.84rem',
                fontWeight: '600'
              }}
            >
              Imprimir
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

          {/* Feedback en línea para operaciones con repuestos (sin modal alert bloqueante) */}
          {mensajeRepuesto && (
            <div className="no-imprimir" style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              marginBottom: '12px',
              backgroundColor: mensajeRepuesto.tipo === 'exito' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: mensajeRepuesto.tipo === 'exito' ? '#047857' : '#b91c1c',
              border: `1px solid ${mensajeRepuesto.tipo === 'exito' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {mensajeRepuesto.texto}
            </div>
          )}

          {/* Form para agregar repuesto (Oculto al imprimir y deshabilitado si ya fue entregada) */}
          {ordenDetalle.estado !== 'Entregada' && (
            <form
              className="no-imprimir"
              onSubmit={onAgregarRepuesto}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '14px',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-principal)',
                border: '1px solid var(--borde-input)'
              }}
            >
              {/* Barra de filtros para repuestos */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {([
                    { id: 'todos', label: 'Todos' },
                    { id: 'repuesto', label: 'Repuestos' },
                    { id: 'accesorio', label: 'Accesorios' }
                  ] as const).map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltroTipoRepuesto(f.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: filtroTipoRepuesto === f.id ? 'none' : '1px solid var(--borde-input)',
                        backgroundColor: filtroTipoRepuesto === f.id ? 'var(--azul-oscuro)' : 'var(--bg-tarjeta)',
                        color: filtroTipoRepuesto === f.id ? '#ffffff' : 'var(--texto-mutado)'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {proveedoresRepuestos.length > 0 && (
                    <select
                      value={filtroProveedorRepuesto}
                      onChange={e => setFiltroProveedorRepuesto(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--borde-input)',
                        backgroundColor: 'var(--bg-tarjeta)',
                        color: 'var(--texto-principal)',
                        fontSize: '0.76rem',
                        fontWeight: '600'
                      }}
                    >
                      <option value="todos">Todos los proveedores</option>
                      {proveedoresRepuestos.map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  )}

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', fontWeight: '600', color: 'var(--texto-principal)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={soloConStock}
                      onChange={e => setSoloConStock(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Solo con stock
                  </label>
                </div>
              </div>

              {/* Selector con búsqueda integrada + Cantidad + Botón Asignar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 86px auto', gap: '8px', alignItems: 'center' }}>
                <SearchableSelect
                  inputRef={inputRepuestoRef}
                  options={opcionesRepuestos}
                  value={repuestoSeleccionadoId}
                  onChange={val => setRepuestoSeleccionadoId(Number(val) || 0)}
                  placeholder="Buscar y seleccionar repuesto por código, nombre, marca..."
                  emptyMessage="No hay repuestos coincidentes con esos filtros."
                  backgroundColor="var(--bg-tarjeta)"
                />

                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  max={productoRepuestoSeleccionado?.cantidad || 99}
                  value={cantidadRepuesto}
                  onChange={e => setCantidadRepuesto(e.target.value)}
                  placeholder="Cant."
                  style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.88rem', backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                />

                <button
                  type="submit"
                  disabled={guardandoRepuesto || repuestoSeleccionadoId === 0 || !String(cantidadRepuesto).trim()}
                  style={{
                    backgroundColor: 'var(--azul-oscuro)', color: '#ffffff', border: 'none', padding: '9px 16px',
                    borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', cursor: guardandoRepuesto || repuestoSeleccionadoId === 0 || !String(cantidadRepuesto).trim() ? 'not-allowed' : 'pointer',
                    opacity: guardandoRepuesto || repuestoSeleccionadoId === 0 || !String(cantidadRepuesto).trim() ? 0.7 : 1
                  }}
                >
                  {guardandoRepuesto ? 'Sumando...' : 'Asignar Repuesto'}
                </button>
              </div>
            </form>
          )}

          {/* Tabla de repuestos de la orden */}
          <div style={{ border: '1px solid var(--borde-input)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '8px 12px', color: 'var(--texto-mutado)' }}>Descripción</th>
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
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatearMoneda(item.precio_unitario)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>{formatearMoneda(item.costo_total)}</td>
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
              {formatearMoneda(ordenDetalle.costo_mano_obra)}
            </div>
          </div>

          <div style={{ padding: '10px', backgroundColor: 'var(--bg-principal)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>Total Repuestos</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2563eb' }}>
              {formatearMoneda(totalRepuestosCosto)}
            </div>
          </div>

          <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '700' }}>Total Liquidación</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>
              {formatearMoneda(ordenDetalle.costo_total)}
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA IMPRESIÓN */}
        <div className="imprimir-flex" style={{ marginTop: '14px', paddingTop: '10px', fontSize: '0.78rem', borderTop: '1px solid #cbd5e1' }}>
          <div>
            <strong style={{ color: '#0f172a' }}>COMPROBANTE DE SERVICIO TÉCNICO — DOCUMENTO NO VÁLIDO COMO FACTURA FISCAL</strong><br />
            <span style={{ color: '#64748b' }}>
              Comprobante de gestión comercial interna &bull; Gracias por elegir <strong>DN BIKES</strong>.
            </span>
          </div>
        </div>

        <div className="no-imprimir" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onCerrar}
            style={{ padding: '10px 24px', backgroundColor: 'transparent', color: 'var(--texto-principal)', border: '1px solid var(--borde-input)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
