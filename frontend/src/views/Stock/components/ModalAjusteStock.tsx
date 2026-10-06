import { useState, useMemo, useRef, useEffect } from 'react';
import type { Producto } from '../../../types';
import type { FormMovimientoData } from '../types';

interface ModalAjusteStockProps {
  visible: boolean;
  productos: Producto[];
  nuevoMovimiento: FormMovimientoData;
  guardando: boolean;
  error: string | null;
  onChangeMovimiento: (data: FormMovimientoData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/** Modal de ajuste manual de stock con buscador interactivo de productos (search-as-you-type). */
export function ModalAjusteStock({
  visible,
  productos,
  nuevoMovimiento,
  guardando,
  error,
  onChangeMovimiento,
  onSubmit,
  onClose
}: ModalAjusteStockProps) {
  // Estado local para la búsqueda de productos en tiempo real
  const [busqueda, setBusqueda] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [indiceResaltado, setIndiceResaltado] = useState(-1);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const contenedorBuscadorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lista de productos activos para selección
  const productosActivos = useMemo(() => {
    return productos.filter(p => p.activo !== false && typeof p.id_producto === 'number');
  }, [productos]);

  // Producto seleccionado según nuevoMovimiento.id_producto
  const productoSeleccionado = useMemo(() => {
    return productos.find(p => p.id_producto === nuevoMovimiento.id_producto);
  }, [productos, nuevoMovimiento.id_producto]);

  const stockActual = productoSeleccionado ? Number(productoSeleccionado.cantidad || 0) : 0;

  // Filtrado de productos en tiempo real según el término tipeado
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) {
      return productosActivos.slice(0, 10);
    }
    const cleanQ = q.replace(/^#/, '');
    return productosActivos.filter(p => {
      const idStr = String(p.id_producto || '');
      const nombre = (p.nombre || '').toLowerCase();
      const marca = (p.marca || '').toLowerCase();
      const modelo = (p.modelo || '').toLowerCase();
      const tipo = (p.tipo_prod || '').toLowerCase();
      const serie = (p.numero_serie || '').toLowerCase();
      return (
        idStr === cleanQ ||
        idStr.includes(cleanQ) ||
        nombre.includes(q) ||
        marca.includes(q) ||
        modelo.includes(q) ||
        tipo.includes(q) ||
        serie.includes(q)
      );
    }).slice(0, 25);
  }, [productosActivos, busqueda]);

  // Cerrar lista flotante al hacer clic fuera del componente buscador
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contenedorBuscadorRef.current && !contenedorBuscadorRef.current.contains(event.target as Node)) {
        setMostrarResultados(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!visible) return null;

  const handleClose = () => {
    if (
      nuevoMovimiento.id_producto !== 0 ||
      nuevoMovimiento.observaciones?.trim() ||
      (nuevoMovimiento.cantidad && Number(nuevoMovimiento.cantidad) > 0)
    ) {
      if (!window.confirm('Hay cambios sin aplicar en el ajuste de stock. ¿Deseas cerrar la ventana?')) return;
    }
    setBusqueda('');
    setMostrarResultados(false);
    setIndiceResaltado(-1);
    setErrorLocal(null);
    onClose();
  };

  const seleccionarProducto = (prod: Producto) => {
    if (!prod.id_producto) return;
    onChangeMovimiento({ ...nuevoMovimiento, id_producto: prod.id_producto });
    setBusqueda('');
    setMostrarResultados(false);
    setIndiceResaltado(-1);
    setErrorLocal(null);
  };

  const deseleccionarProducto = () => {
    onChangeMovimiento({ ...nuevoMovimiento, id_producto: 0 });
    setBusqueda('');
    setMostrarResultados(true);
    setIndiceResaltado(-1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Soporte para navegar productos mediante teclado (Arriba, Abajo, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mostrarResultados || productosFiltrados.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setMostrarResultados(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceResaltado(prev => (prev < productosFiltrados.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceResaltado(prev => (prev > 0 ? prev - 1 : productosFiltrados.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (indiceResaltado >= 0 && indiceResaltado < productosFiltrados.length) {
        seleccionarProducto(productosFiltrados[indiceResaltado]);
      } else if (productosFiltrados.length === 1) {
        seleccionarProducto(productosFiltrados[0]);
      }
    } else if (e.key === 'Escape') {
      setMostrarResultados(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMovimiento.id_producto || nuevoMovimiento.id_producto <= 0) {
      setErrorLocal('Por favor busca y selecciona un producto antes de aplicar el ajuste.');
      setMostrarResultados(true);
      inputRef.current?.focus();
      return;
    }
    setErrorLocal(null);
    onSubmit(e);
  };

  const errorAMostrar = errorLocal || error;

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
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
          width: 'min(520px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '16px',
          border: '1px solid var(--borde-input)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
          color: 'var(--texto-principal)'
        }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
              Movimiento de Inventario
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '2px 0 0 0' }}>
              Registrar Ajuste de Stock
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}
          >
            ✕
          </button>
        </div>

        {errorAMostrar && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '14px',
              fontWeight: '500'
            }}
          >
            {errorAMostrar}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Campo de Búsqueda y Selección de Producto */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
              Producto a Ajustar *
            </label>

            {productoSeleccionado ? (
              /* Ficha del Producto Seleccionado */
              <div
                style={{
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  backgroundColor: 'rgba(37, 99, 235, 0.04)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        backgroundColor: 'var(--azul-oscuro)',
                        color: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      #{productoSeleccionado.id_producto}
                    </span>
                    <span
                      style={{
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        color: 'var(--texto-principal)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {productoSeleccionado.nombre}
                    </span>
                    {productoSeleccionado.marca && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)', fontWeight: '500' }}>
                        ({productoSeleccionado.marca} {productoSeleccionado.modelo || ''})
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>
                      Stock actual registrado:{' '}
                      <strong style={{ color: stockActual > 0 ? '#059669' : '#dc2626' }}>
                        {stockActual} {stockActual === 1 ? 'unidad' : 'unidades'}
                      </strong>
                    </span>
                    {productoSeleccionado.tipo_prod && (
                      <span style={{ textTransform: 'capitalize', fontSize: '0.75rem', opacity: 0.8 }}>
                        &bull; {productoSeleccionado.tipo_prod}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={deseleccionarProducto}
                  title="Cambiar producto seleccionado"
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--bg-tarjeta)',
                    border: '1px solid var(--borde-input)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--texto-principal)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <span style={{ color: '#ef4444', fontWeight: '800' }}>✕</span> Cambiar
                </button>
              </div>
            ) : (
              /* Barra de Búsqueda Directa con Dropdown Reactivo */
              <div ref={contenedorBuscadorRef} style={{ position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      color: 'var(--texto-mutado)',
                      fontSize: '0.88rem',
                      pointerEvents: 'none'
                    }}
                  >
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={busqueda}
                    onChange={e => {
                      setBusqueda(e.target.value);
                      setMostrarResultados(true);
                      setIndiceResaltado(-1);
                    }}
                    onFocus={() => setMostrarResultados(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Buscar por nombre, código ID (#), marca o modelo..."
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 36px',
                      borderRadius: '8px',
                      border: errorAMostrar && (!nuevoMovimiento.id_producto || nuevoMovimiento.id_producto <= 0)
                        ? '1px solid #ef4444'
                        : '1px solid var(--borde-input)',
                      backgroundColor: 'var(--bg-principal)',
                      color: 'var(--texto-principal)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => {
                        setBusqueda('');
                        inputRef.current?.focus();
                      }}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--texto-mutado)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="Limpiar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown flotante de resultados filtrados */}
                {mostrarResultados && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      backgroundColor: 'var(--bg-tarjeta)',
                      border: '1px solid var(--borde-input)',
                      borderRadius: '10px',
                      boxShadow: '0 12px 24px -4px rgba(0,0,0,0.18)',
                      maxHeight: '230px',
                      overflowY: 'auto'
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--texto-mutado)',
                        backgroundColor: 'var(--bg-principal)',
                        borderBottom: '1px solid var(--borde-input)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>
                        {busqueda.trim()
                          ? `Coincidencias encontradas (${productosFiltrados.length})`
                          : `Sugerencias del catálogo (${productosFiltrados.length})`}
                      </span>
                      <span style={{ fontSize: '0.7rem', textTransform: 'none', fontWeight: '400' }}>
                        Usa &uarr;&darr; y Enter
                      </span>
                    </div>

                    {productosFiltrados.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.85rem' }}>
                        No se encontraron productos con &quot;<strong>{busqueda}</strong>&quot;.
                      </div>
                    ) : (
                      productosFiltrados.map((p, idx) => {
                        const esResaltado = idx === indiceResaltado;
                        const cant = Number(p.cantidad) || 0;
                        return (
                          <div
                            key={p.id_producto}
                            onClick={() => seleccionarProducto(p)}
                            onMouseEnter={() => setIndiceResaltado(idx)}
                            style={{
                              padding: '9px 12px',
                              cursor: 'pointer',
                              borderBottom: idx === productosFiltrados.length - 1 ? 'none' : '1px solid var(--borde-input)',
                              backgroundColor: esResaltado ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.1s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: '800',
                                  backgroundColor: 'rgba(15, 23, 42, 0.08)',
                                  color: 'var(--texto-principal)',
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  flexShrink: 0
                                }}
                              >
                                #{p.id_producto}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: '0.86rem',
                                    fontWeight: '600',
                                    color: 'var(--texto-principal)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {p.nombre}
                                </div>
                                {(p.marca || p.modelo || p.tipo_prod) && (
                                  <div style={{ fontSize: '0.74rem', color: 'var(--texto-mutado)' }}>
                                    {[p.marca, p.modelo].filter(Boolean).join(' ') || p.tipo_prod}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  padding: '2px 7px',
                                  borderRadius: '10px',
                                  backgroundColor: cant > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                  color: cant > 0 ? '#059669' : '#dc2626'
                                }}
                              >
                                Stock: {cant}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                <div style={{ fontSize: '0.76rem', color: 'var(--texto-mutado)', marginTop: '4px' }}>
                  Escribe para buscar al instante entre los {productosActivos.length} productos sin necesidad de recorrer una lista manual.
                </div>
              </div>
            )}
          </div>

          {/* Tipo de Movimiento y Cantidad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Tipo de Ajuste *
              </label>
              <select
                value={nuevoMovimiento.tipo_movimiento}
                onChange={e => onChangeMovimiento({ ...nuevoMovimiento, tipo_movimiento: e.target.value as 'INGRESO' | 'EGRESO' })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--borde-input)',
                  backgroundColor: 'var(--bg-principal)',
                  color: nuevoMovimiento.tipo_movimiento === 'INGRESO' ? '#059669' : '#dc2626',
                  fontSize: '0.9rem',
                  fontWeight: '800'
                }}
              >
                <option value="INGRESO">INGRESO</option>
                <option value="EGRESO">EGRESO</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Cantidad de Unidades *
              </label>
              <input
                type="number"
                min="1"
                max="1000000"
                value={nuevoMovimiento.cantidad}
                onChange={e => onChangeMovimiento({ ...nuevoMovimiento, cantidad: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--borde-input)',
                  backgroundColor: 'var(--bg-principal)',
                  color: 'var(--texto-principal)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
              Motivo del Movimiento *
            </label>
            <select
              value={nuevoMovimiento.motivo}
              onChange={e => onChangeMovimiento({ ...nuevoMovimiento, motivo: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.9rem'
              }}
            >
              <option value="Compra / Reposición">Compra / Reposición a Proveedor</option>
              <option value="Ajuste de Inventario">Ajuste de Conteo Físico / Inventario</option>
              <option value="Rotura o Daño">Rotura o Daño de Producto</option>
              <option value="Uso Interno de Taller">Uso Interno en Taller</option>
              <option value="Devolución de Cliente">Devolución de Cliente</option>
              <option value="Otro Motivo">Otro Motivo</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                Observaciones (Opcional)
              </label>
              <span style={{ fontSize: '0.72rem', color: (nuevoMovimiento.observaciones || '').length >= 250 ? '#ef4444' : 'var(--texto-mutado)' }}>
                {(nuevoMovimiento.observaciones || '').length}/250
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={250}
              value={nuevoMovimiento.observaciones}
              onChange={e => onChangeMovimiento({ ...nuevoMovimiento, observaciones: e.target.value.slice(0, 250) })}
              placeholder="Detalles adicionales, número de comprobante de compra o motivo específico..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '11px',
                border: '1px solid var(--borde-input)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                fontWeight: '600',
                cursor: 'pointer',
                color: 'var(--texto-mutado)'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{
                flex: 2,
                padding: '11px',
                backgroundColor: nuevoMovimiento.tipo_movimiento === 'INGRESO' ? '#059669' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: guardando ? 'not-allowed' : 'pointer',
                opacity: guardando ? 0.7 : 1
              }}
            >
              {guardando ? 'Registrando...' : 'Aplicar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
