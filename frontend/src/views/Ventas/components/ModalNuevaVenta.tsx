import React, { useState, useMemo } from 'react';
import type { Cliente, Producto, MetodoPago, DetalleVentaItem } from '../../../types';
import { formatearMoneda } from '../../../utils/formatters';

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
  errorCarrito?: string | null;
  nombreConsumidorFinal: string;
  apellidoConsumidorFinal: string;
  dniConsumidorFinal: string;
  onCambiarNombreCF: (val: string) => void;
  onCambiarApellidoCF: (val: string) => void;
  onCambiarDniCF: (val: string) => void;
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

/** Modal con flujo completo de punto de venta (carrito, cliente y método de pago). */
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
  errorCarrito,
  nombreConsumidorFinal,
  apellidoConsumidorFinal,
  dniConsumidorFinal,
  onCambiarNombreCF,
  onCambiarApellidoCF,
  onCambiarDniCF,
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
        const cleanTerm = term.replace(/^(bic-?|id\s*:?\s*#?|#)\s*/i, '').trim();
        const nombre = (p.nombre || '').toLowerCase();
        const marca = (p.marca || '').toLowerCase();
        const modelo = (p.modelo || '').toLowerCase();
        const idStr = String(p.id_producto || '');

        const coincideId =
          idStr === term ||
          idStr.includes(term) ||
          `#${idStr}`.includes(term) ||
          `id ${idStr}`.includes(term) ||
          (cleanTerm !== '' && (idStr === cleanTerm || idStr.includes(cleanTerm)));

        return coincideId || nombre.includes(term) || marca.includes(term) || modelo.includes(term);
      }

      return true;
    });
  }, [productos, filtroTipo, busquedaTexto]);

  const productoSeleccionado = useMemo(() => {
    return productos.find(p => p.id_producto === productoBuscadoId);
  }, [productos, productoBuscadoId]);

  // Identificar cliente Consumidor Final para venta rápida de mostrador
  const clienteConsumidorFinal = useMemo(() => {
    return clientes.find(c => 
      (c.nombre?.toLowerCase().trim() === 'consumidor' && c.apellido?.toLowerCase().trim() === 'final') ||
      (c.nombre?.toLowerCase().trim() === 'final' && c.apellido?.toLowerCase().trim() === 'consumidor') ||
      c.direccion?.toLowerCase().includes('mostrador')
    );
  }, [clientes]);

  // Determinar si el cliente actualmente seleccionado es Consumidor Final
  const esConsumidorFinal = useMemo(() => {
    if (!clienteSeleccionadoId || clienteSeleccionadoId === 0) return true;
    if (clienteConsumidorFinal && clienteSeleccionadoId === clienteConsumidorFinal.id_cliente) return true;
    const c = clientes.find(cli => cli.id_cliente === clienteSeleccionadoId);
    if (!c) return false;
    return (
      (c.nombre?.toLowerCase().trim() === 'consumidor' && c.apellido?.toLowerCase().trim() === 'final') ||
      (c.nombre?.toLowerCase().trim() === 'final' && c.apellido?.toLowerCase().trim() === 'consumidor') ||
      c.direccion?.toLowerCase().includes('mostrador')
    );
  }, [clienteSeleccionadoId, clienteConsumidorFinal, clientes]);

  // Priorizar Consumidor Final al inicio de la lista de selección
  const clientesOrdenados = useMemo(() => {
    return [...clientes].sort((a, b) => {
      const aEsCF = (a.nombre?.toLowerCase().trim() === 'consumidor' && a.apellido?.toLowerCase().trim() === 'final') ||
                    (a.nombre?.toLowerCase().trim() === 'final' && a.apellido?.toLowerCase().trim() === 'consumidor') ||
                    a.direccion?.toLowerCase().includes('mostrador');
      const bEsCF = (b.nombre?.toLowerCase().trim() === 'consumidor' && b.apellido?.toLowerCase().trim() === 'final') ||
                    (b.nombre?.toLowerCase().trim() === 'final' && b.apellido?.toLowerCase().trim() === 'consumidor') ||
                    b.direccion?.toLowerCase().includes('mostrador');
      if (aEsCF && !bEsCF) return -1;
      if (!aEsCF && bEsCF) return 1;
      return (a.apellido || '').localeCompare(b.apellido || '');
    });
  }, [clientes]);

  const handleClose = () => {
    if (carritoDetalle.length > 0) {
      if (!window.confirm('Hay artículos agregados al comprobante. ¿Seguro que deseas salir y descartar la venta?')) return;
    }
    onClose();
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        width: '760px',
        maxWidth: '94vw',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
        maxHeight: '90vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        color: 'var(--texto-principal)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--texto-principal)', margin: 0 }}>
            Generar Comprobante de Venta
          </h3>
          <button
            type="button"
            onClick={handleClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* SELECCIÓN DE CLIENTE Y MÉTODO DE PAGO */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                  Cliente Comprador *
                </label>
                {clienteConsumidorFinal && clienteSeleccionadoId !== clienteConsumidorFinal.id_cliente && (
                  <button
                    type="button"
                    onClick={() => onCambiarCliente(clienteConsumidorFinal.id_cliente!)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--azul-oscuro)',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Usar Consumidor Final
                  </button>
                )}
              </div>
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
                <option value={0}>Seleccionar Cliente ({clientesOrdenados.length} disponibles)</option>
                {clientesOrdenados.map(c => {
                  const esCF = (c.nombre?.toLowerCase().trim() === 'consumidor' && c.apellido?.toLowerCase().trim() === 'final') ||
                               (c.nombre?.toLowerCase().trim() === 'final' && c.apellido?.toLowerCase().trim() === 'consumidor') ||
                               c.direccion?.toLowerCase().includes('mostrador');
                  return (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {esCF ? 'Consumidor Final (S/DNI - Venta Mostrador)' : `${c.apellido} ${c.nombre} (DNI: ${c.dni || 'S/DNI'})`}
                    </option>
                  );
                })}
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

          {/* CAMPOS RÁPIDOS PARA DATOS DE CONSUMIDOR FINAL */}
          {esConsumidorFinal && (
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.04)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--azul-oscuro)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>👤 Datos del Comprador (Consumidor Final)</span>
                  <span style={{ fontSize: '0.74rem', fontWeight: '500', color: 'var(--texto-mutado)' }}>(Opcional)</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)' }}>
                  Asigna nombre y DNI a este comprobante sin crear nuevo cliente
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--texto-mutado)' }}>
                    Nombre
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={nombreConsumidorFinal}
                    onChange={e => onCambiarNombreCF(e.target.value)}
                    placeholder="Ej. Juan"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--borde-input)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-principal)',
                      color: 'var(--texto-principal)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--texto-mutado)' }}>
                    Apellido
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={apellidoConsumidorFinal}
                    onChange={e => onCambiarApellidoCF(e.target.value)}
                    placeholder="Ej. Pérez"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--borde-input)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-principal)',
                      color: 'var(--texto-principal)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--texto-mutado)' }}>
                    DNI / Identificación
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={dniConsumidorFinal}
                    onChange={e => onCambiarDniCF(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                    placeholder="Ej. 38123456"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--borde-input)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-principal)',
                      color: 'var(--texto-principal)'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aviso informativo de garantía si se vende bicicleta a Consumidor Final */}
          {esConsumidorFinal && carritoDetalle.some(item => {
            const prod = productos.find(p => p.id_producto === item.id_producto);
            return prod?.tipo_prod === 'bicicleta';
          }) && (
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#1d4ed8',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '500'
            }}>
              Aviso: Se ha agregado una bicicleta al comprobante. {nombreConsumidorFinal.trim() || dniConsumidorFinal.trim() ? `La garantía oficial de 30 días quedará emitida para "${`${nombreConsumidorFinal} ${apellidoConsumidorFinal}`.trim()}${dniConsumidorFinal ? ` (DNI: ${dniConsumidorFinal})` : ''}".` : 'Podés completar el nombre y DNI arriba para que la garantía oficial quede registrada a nombre del titular comprador.'}
            </div>
          )}

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
              maxLength={60}
              value={busquedaTexto}
              onChange={e => setBusquedaTexto(e.target.value.slice(0, 60))}
              placeholder="Buscar artículo por ID, nombre, marca o modelo..."
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

            {errorCarrito && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {errorCarrito}
              </div>
            )}

            {/* Selector de Producto a ancho completo */}
            <select
              value={productoBuscadoId}
              onChange={e => onCambiarProductoBuscado(Number(e.target.value))}
              style={{
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                textOverflow: 'ellipsis'
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
                    #{p.id_producto} - {p.nombre} {p.marca ? `(${p.marca})` : ''} — {formatearMoneda(p.precio)} [Stock: {p.cantidad} un.]{sinStock ? ' (AGOTADO)' : ''}
                  </option>
                );
              })}
            </select>

            {/* Barra Integrada: Información de Stock + Cantidad + Botón Añadir */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'var(--bg-principal)',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--borde-input)',
              flexWrap: 'wrap',
              boxSizing: 'border-box'
            }}>
              {/* Info del producto seleccionado */}
              <div style={{ flex: '1 1 200px', fontSize: '0.84rem', color: 'var(--texto-principal)', minWidth: 0 }}>
                {productoSeleccionado ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>
                      <strong>Stock:</strong>{' '}
                      <span style={{ color: Number(productoSeleccionado.cantidad) > 0 ? '#16a34a' : '#ef4444', fontWeight: '700' }}>
                        {productoSeleccionado.cantidad} un.
                      </span>
                    </span>
                    <span style={{ color: 'var(--texto-mutado)' }}>&bull;</span>
                    <span>
                      <strong>Precio:</strong>{' '}
                      <span style={{ fontWeight: '700' }}>{formatearMoneda(productoSeleccionado.precio)}</span>
                    </span>
                    {productoSeleccionado.tipo_prod === 'bicicleta' && (
                      <span style={{
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563eb',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: '700'
                      }}>
                        🛡️ Garantía 30 días
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: 'var(--texto-mutado)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                    Seleccioná un artículo de la lista de arriba para agregarlo.
                  </span>
                )}
              </div>

              {/* Controles de Cantidad y Botón Añadir */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--texto-mutado)' }}>
                    Cant:
                  </label>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1px solid var(--borde-input)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tarjeta)',
                    overflow: 'hidden'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        const actual = parseInt(String(cantidadAnadir), 10) || 1;
                        if (actual > 1) onCambiarCantidad(actual - 1);
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        color: 'var(--texto-principal)',
                        fontWeight: '700',
                        fontSize: '0.9rem'
                      }}
                      title="Disminuir cantidad"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="1000000"
                      value={cantidadAnadir}
                      onChange={e => onCambiarCantidad(e.target.value)}
                      style={{
                        width: '54px',
                        padding: '6px 4px',
                        border: 'none',
                        borderLeft: '1px solid var(--borde-input)',
                        borderRight: '1px solid var(--borde-input)',
                        fontSize: '0.88rem',
                        backgroundColor: 'transparent',
                        color: 'var(--texto-principal)',
                        textAlign: 'center',
                        fontWeight: '700',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const actual = parseInt(String(cantidadAnadir), 10) || 1;
                        onCambiarCantidad(actual + 1);
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        color: 'var(--texto-principal)',
                        fontWeight: '700',
                        fontSize: '0.9rem'
                      }}
                      title="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onAgregarItem}
                  disabled={!productoBuscadoId || (productoSeleccionado && Number(productoSeleccionado.cantidad) <= 0)}
                  style={{
                    backgroundColor: (!productoBuscadoId || (productoSeleccionado && Number(productoSeleccionado.cantidad) <= 0))
                      ? '#94a3b8'
                      : 'var(--azul-oscuro)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: (!productoBuscadoId || (productoSeleccionado && Number(productoSeleccionado.cantidad) <= 0)) ? 'not-allowed' : 'pointer',
                    fontSize: '0.86rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <span>＋ Añadir</span>
                </button>
              </div>
            </div>
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
                          {formatearMoneda(item.precio_unitario)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--texto-principal)' }}>
                          {formatearMoneda(item.costo_total || (item.cantidad * item.precio_unitario))}
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
                {formatearMoneda(totalVenta)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleClose}
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
