import React, { useState, useMemo } from 'react';
import type { Cliente, Producto, MetodoPago, DetalleVentaItem } from '../../../types';

interface ModalNuevaVentaProps {
  clientes: Cliente[];
  productos: Producto[];
  metodosPago: MetodoPago[];
  clienteSeleccionadoId: number;
  metodoPagoSeleccionadoId: number;
  productoBuscadoId: number;
  cantidadAnadir: number | string;
  filtroTipo: string;
  carritoDetalle: DetalleVentaItem[];
  totalVenta: number;
  guardando: boolean;
  onCambiarCliente: (id: number) => void;
  onCambiarMetodoPago: (id: number) => void;
  onCambiarProductoBuscado: (id: number) => void;
  onCambiarCantidad: (cant: string | number) => void;
  onCambiarFiltroTipo: (tipo: string) => void;
  onAgregarItem: () => void;
  onActualizarCantidadItem: (idProd: number, nuevaCantidad: number) => void;
  onQuitarItem: (idProd: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ModalNuevaVenta({
  clientes,
  productos,
  metodosPago,
  clienteSeleccionadoId,
  metodoPagoSeleccionadoId,
  productoBuscadoId,
  cantidadAnadir,
  filtroTipo,
  carritoDetalle,
  totalVenta,
  guardando,
  onCambiarCliente,
  onCambiarMetodoPago,
  onCambiarProductoBuscado,
  onCambiarCantidad,
  onCambiarFiltroTipo,
  onAgregarItem,
  onActualizarCantidadItem,
  onQuitarItem,
  onSubmit,
  onClose
}: ModalNuevaVentaProps) {
  const [busquedaTexto, setBusquedaTexto] = useState('');

  // Filtrado reactivo y seguro de productos (solo activos)
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      if (p.activo === false) return false;

      const prodTipo = (p.tipo_prod || '').toLowerCase().trim();
      const filtro = filtroTipo.toLowerCase().trim();
      const coincideTipo = filtro === 'todos' || prodTipo === filtro || prodTipo.startsWith(filtro) || filtro.startsWith(prodTipo);

      if (!coincideTipo) return false;

      if (busquedaTexto.trim()) {
        const term = busquedaTexto.toLowerCase().trim();
        const nombre = (p.nombre || '').toLowerCase();
        const marca = (p.marca || '').toLowerCase();
        const modelo = (p.modelo || '').toLowerCase();
        const idStr = String(p.id_producto || '');
        return nombre.includes(term) || marca.includes(term) || modelo.includes(term) || idStr.includes(term);
      }

      return true;
    });
  }, [productos, filtroTipo, busquedaTexto]);

  const productoSeleccionado = useMemo(() => {
    return productos.find(p => p.id_producto === productoBuscadoId);
  }, [productos, productoBuscadoId]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '780px', padding: '28px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto',
        color: 'var(--texto-principal)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--texto-principal)', margin: 0 }}>
            Generar Comprobante de Venta
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* SELECCIÓN DE CLIENTE Y MÉTODO DE PAGO */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Cliente Comprador *
              </label>
              <select
                value={clienteSeleccionadoId}
                onChange={e => onCambiarCliente(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: '1px solid var(--borde-input)', fontSize: '0.9rem',
                  backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)'
                }}
                required
              >
                <option value={0}>Seleccionar Cliente ({clientes.length} disponibles)</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.apellido} {c.nombre} (DNI: {c.dni || 'S/DNI'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Método de Pago *
              </label>
              <select
                value={metodoPagoSeleccionadoId}
                onChange={e => onCambiarMetodoPago(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: '1px solid var(--borde-input)', fontSize: '0.9rem',
                  backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)'
                }}
                required
              >
                {metodosPago.map(m => (
                  <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed var(--borde-input)', margin: '4px 0' }} />

          {/* SELECCIÓN DE PRODUCTOS DESDE STOCK */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                Agregar Artículos del Inventario
              </label>

              {/* Filtros por tipo de producto */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['todos', 'bicicleta', 'repuesto', 'accesorio'].map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => onCambiarFiltroTipo(tipo)}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', border: 'none', cursor: 'pointer',
                      textTransform: 'capitalize', fontWeight: '600',
                      backgroundColor: filtroTipo === tipo ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                      color: filtroTipo === tipo ? '#fff' : 'var(--texto-mutado)'
                    }}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>

            {/* Buscador de Producto por texto */}
            <input
              type="text"
              value={busquedaTexto}
              onChange={e => setBusquedaTexto(e.target.value)}
              placeholder="Buscar artículo por nombre, marca o modelo..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                fontSize: '0.85rem',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px auto', gap: '10px' }}>
              <select
                value={productoBuscadoId}
                onChange={e => onCambiarProductoBuscado(Number(e.target.value))}
                style={{
                  padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                  fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)'
                }}
              >
                <option value={0}>
                  {productosFiltrados.length > 0
                    ? `Seleccionar Artículo (${productosFiltrados.length} encontrados)`
                    : 'No hay artículos coincidentes con stock activo'}
                </option>
                {productosFiltrados.map(p => {
                  const sinStock = Number(p.cantidad) <= 0;
                  return (
                    <option key={p.id_producto} value={p.id_producto} disabled={sinStock}>
                      {p.nombre} {p.marca ? `(${p.marca})` : ''} — ${Number(p.precio).toLocaleString()} [Stock: {p.cantidad} un.]{sinStock ? ' (AGOTADO)' : ''}
                    </option>
                  );
                })}
              </select>

              <input
                type="number"
                min="1"
                value={cantidadAnadir}
                onChange={e => onCambiarCantidad(e.target.value)}
                placeholder="Cant."
                style={{
                  padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                  fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)',
                  textAlign: 'center'
                }}
              />

              <button
                type="button"
                onClick={onAgregarItem}
                style={{
                  backgroundColor: 'var(--azul-oscuro)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                Añadir
              </button>
            </div>

            {productoSeleccionado && (
              <div style={{
                fontSize: '0.82rem',
                color: 'var(--texto-principal)',
                backgroundColor: 'var(--bg-principal)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--borde-input)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  <strong>Stock disponible:</strong> {productoSeleccionado.cantidad} unidades | <strong>Precio Unitario:</strong> ${Number(productoSeleccionado.precio).toLocaleString()}
                </span>
                {productoSeleccionado.tipo_prod === 'bicicleta' && (
                  <span style={{ color: '#2563eb', fontWeight: '700' }}>
                    🛡️ Garantía 30 días incluida
                  </span>
                )}
              </div>
            )}
          </div>

          {/* LISTA DEL CARRITO / DETALLE ACTUAL */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              Artículos en el comprobante ({carritoDetalle.length})
            </h4>
            {carritoDetalle.length === 0 ? (
              <div style={{
                padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-principal)',
                borderRadius: '8px', color: 'var(--texto-mutado)', fontSize: '0.88rem',
                border: '1px dashed var(--borde-input)'
              }}>
                No has agregado artículos al comprobante. Selecciona un producto arriba y haz clic en <strong>+ Añadir</strong>.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--borde-input)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ backgroundColor: 'var(--bg-principal)', borderBottom: '1px solid var(--borde-input)' }}>
                    <tr>
                      <th style={{ padding: '10px 12px' }}>Producto</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Cant.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Precio Unit.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Subtotal</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carritoDetalle.map(item => (
                      <tr key={item.id_producto} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontWeight: '700' }}>{item.nombre}</span>
                          {(item.marca || item.modelo) && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', marginLeft: '6px' }}>
                              ({item.marca} {item.modelo})
                            </span>
                          )}
                          {item.tipo_prod === 'bicicleta' && (
                            <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '700', marginLeft: '6px' }}>
                              [Garantía 30 Días]
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => onActualizarCantidadItem(item.id_producto, item.cantidad - 1)}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--borde-input)',
                                backgroundColor: 'var(--bg-principal)',
                                color: 'var(--texto-principal)',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.85rem'
                              }}
                            >
                              -
                            </button>
                            <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '700' }}>
                              {item.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => onActualizarCantidadItem(item.id_producto, item.cantidad + 1)}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--borde-input)',
                                backgroundColor: 'var(--bg-principal)',
                                color: 'var(--texto-principal)',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.85rem'
                              }}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          ${item.precio_unitario.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--texto-principal)' }}>
                          ${((item.costo_total || (item.cantidad * item.precio_unitario))).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => onQuitarItem(item.id_producto)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}
                            title="Quitar artículo"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TOTAL Y ACCIÓN */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid var(--borde-input)' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontWeight: '700' }}>
                Total a Facturar:
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#16a34a' }}>
                ${totalVenta.toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 18px', backgroundColor: 'transparent',
                  border: '1px solid var(--borde-input)', borderRadius: '8px', color: 'var(--texto-principal)',
                  cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem'
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando || carritoDetalle.length === 0}
                style={{
                  padding: '10px 22px', backgroundColor: '#16a34a', color: '#fff',
                  border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem',
                  opacity: guardando || carritoDetalle.length === 0 ? 0.6 : 1,
                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
                }}
              >
                {guardando ? 'Emitiendo comprobante...' : 'Finalizar Venta'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
