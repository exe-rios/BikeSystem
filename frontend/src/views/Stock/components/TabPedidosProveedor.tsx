import { useState, useMemo, useRef } from 'react';
import type { Producto, Proveedor } from '../../../types';
import { api } from '../../../services/api';
import { exportarPedidoExcel, exportarPedidoPDF } from '../utils/exportarPedidoProveedor';

interface TabPedidosProveedorProps {
  proveedores: Proveedor[];
}

type FiltroStockPedido = 'alerta' | 'sin_stock' | 'bajo_stock' | 'todos';
type FiltroTipoPedido = 'todos' | 'repuesto' | 'bicicleta' | 'accesorio';

const calcularCantidadSugerida = (p: Producto): number => {
  const actual = Number(p.cantidad) || 0;
  const minimo = Number(p.stock_minimo) || 0;
  if (minimo > actual) {
    return Math.max(1, minimo - actual);
  }
  return 1;
};

/** Pestaña para armar pedidos de reposición por proveedor y exportarlos a Excel o PDF. */
export function TabPedidosProveedor({ proveedores }: TabPedidosProveedorProps) {
  const proveedoresOrdenados = useMemo(
    () => [...proveedores].sort((a, b) => a.nombre_empresa.localeCompare(b.nombre_empresa)),
    [proveedores]
  );

  const [idProveedorSel, setIdProveedorSel] = useState<string>('');
  const [productosProv, setProductosProv] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filtroStock, setFiltroStock] = useState<FiltroStockPedido>('alerta');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoPedido>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  // Mapa id_producto -> cantidad a pedir (solo contiene los ítems seleccionados)
  const [seleccionados, setSeleccionados] = useState<Record<number, number>>({});
  const solicitudSeqRef = useRef(0);

  const handleCambiarProveedor = async (nuevoIdProv: string) => {
    setIdProveedorSel(nuevoIdProv);
    setSeleccionados({});
    setError(null);
    const seq = ++solicitudSeqRef.current;

    if (!nuevoIdProv) {
      setProductosProv([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    try {
      const res = await api.productos.getAll({
        id_proveedor: nuevoIdProv,
        estado: 'activos'
      });
      if (solicitudSeqRef.current !== seq) return;
      const lista = Array.isArray(res?.productos) ? res.productos : [];
      setProductosProv(lista);
    } catch (err: unknown) {
      if (solicitudSeqRef.current !== seq) return;
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos del proveedor.');
      setProductosProv([]);
    } finally {
      if (solicitudSeqRef.current === seq) {
        setCargando(false);
      }
    }
  };

  const proveedorActual = useMemo(
    () => proveedoresOrdenados.find(p => String(p.id_proveedor) === idProveedorSel) || null,
    [proveedoresOrdenados, idProveedorSel]
  );

  const conteosStock = useMemo(() => {
    let sinStock = 0;
    let bajoStock = 0;
    for (const p of productosProv) {
      const cant = Number(p.cantidad) || 0;
      const min = Number(p.stock_minimo) || 0;
      if (cant <= 0) sinStock++;
      else if (min > 0 && cant <= min) bajoStock++;
    }
    return {
      alerta: sinStock + bajoStock,
      sinStock,
      bajoStock,
      todos: productosProv.length
    };
  }, [productosProv]);

  const productosVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productosProv.filter(p => {
      const cant = Number(p.cantidad) || 0;
      const min = Number(p.stock_minimo) || 0;

      if (filtroStock === 'alerta' && !(cant <= 0 || (min > 0 && cant <= min))) return false;
      if (filtroStock === 'sin_stock' && cant > 0) return false;
      if (filtroStock === 'bajo_stock' && !(cant > 0 && min > 0 && cant <= min)) return false;

      if (filtroTipo !== 'todos' && p.tipo_prod !== filtroTipo) return false;

      if (q) {
        const match =
          (p.codigo || '').toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          (p.marca || '').toLowerCase().includes(q) ||
          (p.modelo || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [productosProv, filtroStock, filtroTipo, busqueda]);

  const itemsSeleccionadosLista = useMemo(() => {
    const res: Array<{ producto: Producto; cantidadPedir: number }> = [];
    for (const p of productosProv) {
      if (!p.id_producto) continue;
      const cantPedir = seleccionados[p.id_producto];
      if (cantPedir && cantPedir > 0) {
        res.push({ producto: p, cantidadPedir: cantPedir });
      }
    }
    return res;
  }, [productosProv, seleccionados]);

  const totalUnidadesPedido = useMemo(
    () => itemsSeleccionadosLista.reduce((acc, it) => acc + it.cantidadPedir, 0),
    [itemsSeleccionadosLista]
  );

  const todosVisiblesSeleccionados = useMemo(() => {
    if (productosVisibles.length === 0) return false;
    return productosVisibles.every(p => p.id_producto && (seleccionados[p.id_producto] || 0) > 0);
  }, [productosVisibles, seleccionados]);

  const toggleProducto = (p: Producto) => {
    if (!p.id_producto) return;
    const id = p.id_producto;
    setSeleccionados(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = calcularCantidadSugerida(p);
      }
      return next;
    });
  };

  const handleCambiarCantidad = (p: Producto, valorStr: string) => {
    if (!p.id_producto) return;
    const id = p.id_producto;
    const num = Math.trunc(Number(valorStr));
    setSeleccionados(prev => {
      const next = { ...prev };
      if (!valorStr || isNaN(num) || num <= 0) {
        delete next[id];
      } else {
        next[id] = Math.min(num, 999999);
      }
      return next;
    });
  };

  const handleToggleTodosVisibles = () => {
    setSeleccionados(prev => {
      const next = { ...prev };
      if (todosVisiblesSeleccionados) {
        for (const p of productosVisibles) {
          if (p.id_producto) delete next[p.id_producto];
        }
      } else {
        for (const p of productosVisibles) {
          if (p.id_producto && !next[p.id_producto]) {
            next[p.id_producto] = calcularCantidadSugerida(p);
          }
        }
      }
      return next;
    });
  };

  const handleExportar = (formato: 'xlsx' | 'pdf') => {
    if (itemsSeleccionadosLista.length === 0) {
      alert('Seleccioná al menos un artículo para generar el pedido.');
      return;
    }

    const payload = {
      proveedor: proveedorActual,
      nombreProveedorFallback:
        idProveedorSel === 'todos'
          ? 'Varios Proveedores'
          : idProveedorSel === 'sin_proveedor'
          ? 'Sin Proveedor'
          : 'Proveedor',
      observaciones,
      items: itemsSeleccionadosLista
    };

    if (formato === 'xlsx') {
      exportarPedidoExcel(payload);
    } else {
      exportarPedidoPDF(payload);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Panel superior: Selección de Proveedor y Acciones de Exportación */}
      <div
        style={{
          backgroundColor: 'var(--bg-tarjeta)',
          border: '1px solid var(--borde-input)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              Proveedor del Pedido *
            </label>
            <select
              value={idProveedorSel}
              onChange={e => handleCambiarProveedor(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.92rem',
                fontWeight: '600'
              }}
            >
              <option value="">Seleccioná un proveedor...</option>
              <option value="todos">Todos los proveedores</option>
              <option value="sin_proveedor">Productos sin proveedor asignado</option>
              {proveedoresOrdenados.map(prov => (
                <option key={prov.id_proveedor} value={String(prov.id_proveedor)}>
                  {prov.nombre_empresa}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              Observaciones del Pedido (Opcional)
            </label>
            <input
              type="text"
              maxLength={120}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Ej: Enviar por transporte, entrega urgente..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              disabled={itemsSeleccionadosLista.length === 0}
              onClick={() => handleExportar('xlsx')}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #15803d',
                backgroundColor: itemsSeleccionadosLista.length > 0 ? '#15803d' : 'var(--bg-principal)',
                color: itemsSeleccionadosLista.length > 0 ? '#ffffff' : 'var(--texto-mutado)',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: itemsSeleccionadosLista.length > 0 ? 'pointer' : 'not-allowed',
                opacity: itemsSeleccionadosLista.length > 0 ? 1 : 0.65
              }}
            >
              Exportar Excel (.xlsx)
            </button>

            <button
              type="button"
              disabled={itemsSeleccionadosLista.length === 0}
              onClick={() => handleExportar('pdf')}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: itemsSeleccionadosLista.length > 0 ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                color: itemsSeleccionadosLista.length > 0 ? '#ffffff' : 'var(--texto-mutado)',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: itemsSeleccionadosLista.length > 0 ? 'pointer' : 'not-allowed',
                opacity: itemsSeleccionadosLista.length > 0 ? 1 : 0.65
              }}
            >
              Exportar PDF (.pdf)
            </button>
          </div>
        </div>

        {/* Resumen de selección y orden de columnas */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--borde-input)',
            fontSize: '0.82rem'
          }}
        >
          <span style={{ color: 'var(--texto-mutado)' }}>
            Orden de exportación: <strong style={{ color: 'var(--texto-principal)' }}>CÓDIGO → CANTIDAD → DESCRIPCIÓN</strong>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: itemsSeleccionadosLista.length > 0 ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-principal)',
                color: itemsSeleccionadosLista.length > 0 ? 'var(--azul-oscuro)' : 'var(--texto-mutado)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontWeight: '700'
              }}
            >
              {itemsSeleccionadosLista.length} artículo(s) seleccionado(s) • {totalUnidadesPedido} unid. a pedir
            </span>

            {itemsSeleccionadosLista.length > 0 && (
              <button
                type="button"
                onClick={() => setSeleccionados({})}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Limpiar selección
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.88rem'
          }}
        >
          {error}
        </div>
      )}

      {!idProveedorSel ? (
        <div
          style={{
            backgroundColor: 'var(--bg-tarjeta)',
            border: '1px dashed var(--borde-input)',
            borderRadius: '12px',
            padding: '42px 24px',
            textAlign: 'center',
            color: 'var(--texto-mutado)'
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--texto-principal)', marginBottom: '6px' }}>
            Seleccioná un proveedor para armar el pedido
          </div>
          <div style={{ fontSize: '0.86rem' }}>
            Vas a poder ver los artículos con bajo stock o agotados de ese proveedor, elegir qué pedir, definir las cantidades y exportar el pedido en Excel o PDF.
          </div>
        </div>
      ) : (
        <>
          {/* Filtros de artículos del proveedor */}
          <div
            style={{
              backgroundColor: 'var(--bg-tarjeta)',
              border: '1px solid var(--borde-input)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {(
                [
                  { id: 'alerta', label: `Bajo Stock / Agotados (${conteosStock.alerta})` },
                  { id: 'sin_stock', label: `Agotados (${conteosStock.sinStock})` },
                  { id: 'bajo_stock', label: `Bajo Stock (${conteosStock.bajoStock})` },
                  { id: 'todos', label: `Todos del Proveedor (${conteosStock.todos})` }
                ] as const
              ).map(f => {
                const activo = filtroStock === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroStock(f.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.79rem',
                      fontWeight: '700',
                      border: '1px solid var(--borde-input)',
                      cursor: 'pointer',
                      backgroundColor: activo ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                      color: activo ? '#ffffff' : 'var(--texto-mutado)'
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value as FiltroTipoPedido)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--borde-input)',
                  backgroundColor: 'var(--bg-principal)',
                  color: 'var(--texto-principal)',
                  fontSize: '0.82rem',
                  fontWeight: '600'
                }}
              >
                <option value="todos">Todos los tipos</option>
                <option value="repuesto">Repuestos</option>
                <option value="bicicleta">Bicicletas</option>
                <option value="accesorio">Accesorios</option>
              </select>

              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar código o descripción..."
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--borde-input)',
                  backgroundColor: 'var(--bg-principal)',
                  color: 'var(--texto-principal)',
                  fontSize: '0.82rem',
                  minWidth: '210px'
                }}
              />
            </div>
          </div>

          {/* Tabla de selección con orden: Selección | Código | Cantidad a Pedir | Descripción | Stock Actual/Mín | Estado */}
          <div
            style={{
              backgroundColor: 'var(--bg-tarjeta)',
              border: '1px solid var(--borde-input)',
              borderRadius: '12px',
              overflowX: 'auto'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-principal)', borderBottom: '1px solid var(--borde-input)' }}>
                  <th style={{ padding: '12px 14px', width: '42px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={todosVisiblesSeleccionados}
                      disabled={productosVisibles.length === 0}
                      onChange={handleToggleTodosVisibles}
                      title="Seleccionar / deseleccionar todos los visibles"
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', width: '150px' }}>
                    Código
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', width: '125px', textAlign: 'center' }}>
                    Cant. a Pedir
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
                    Descripción del Producto
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'center', width: '120px' }}>
                    Stock / Mín.
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'center', width: '115px' }}>
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                      Cargando productos del proveedor...
                    </td>
                  </tr>
                ) : productosVisibles.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                      {filtroStock === 'alerta' && conteosStock.todos > 0 ? (
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--texto-principal)', marginBottom: '6px' }}>
                            No hay artículos con bajo stock o agotados para este proveedor.
                          </div>
                          <button
                            type="button"
                            onClick={() => setFiltroStock('todos')}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              border: '1px solid var(--borde-input)',
                              backgroundColor: 'var(--bg-principal)',
                              color: 'var(--texto-principal)',
                              fontWeight: '600',
                              fontSize: '0.82rem',
                              cursor: 'pointer'
                            }}
                          >
                            Ver todos los productos del proveedor ({conteosStock.todos})
                          </button>
                        </div>
                      ) : (
                        'No se encontraron productos con los filtros seleccionados.'
                      )}
                    </td>
                  </tr>
                ) : (
                  productosVisibles.map(p => {
                    const id = p.id_producto || 0;
                    const cantPedir = seleccionados[id] || 0;
                    const estaSeleccionado = cantPedir > 0;
                    const cantActual = Number(p.cantidad) || 0;
                    const stockMin = Number(p.stock_minimo) || 0;
                    const esSinStock = cantActual <= 0;
                    const esBajoStock = !esSinStock && stockMin > 0 && cantActual <= stockMin;

                    return (
                      <tr
                        key={id}
                        style={{
                          borderBottom: '1px solid var(--borde-input)',
                          backgroundColor: estaSeleccionado ? 'rgba(37, 99, 235, 0.05)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={estaSeleccionado}
                            onChange={() => toggleProducto(p)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </td>

                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: '700', fontSize: '0.84rem', color: p.codigo ? 'var(--texto-principal)' : 'var(--texto-mutado)' }}>
                          {p.codigo || `#${id}`}
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            max={999999}
                            value={estaSeleccionado ? cantPedir : ''}
                            placeholder={String(calcularCantidadSugerida(p))}
                            onChange={e => handleCambiarCantidad(p, e.target.value)}
                            style={{
                              width: '74px',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: `1px solid ${estaSeleccionado ? 'var(--azul-oscuro)' : 'var(--borde-input)'}`,
                              backgroundColor: 'var(--bg-principal)',
                              color: 'var(--texto-principal)',
                              fontWeight: '700',
                              fontSize: '0.86rem',
                              textAlign: 'center'
                            }}
                          />
                        </td>

                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--texto-principal)' }}>
                            {p.nombre}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '3px', fontSize: '0.75rem', color: 'var(--texto-mutado)' }}>
                            {p.marca && <span>{p.marca}</span>}
                            {p.modelo && <span>{p.modelo}</span>}
                            {p.tipo_prod === 'bicicleta' && p.rodado && <span>• R{p.rodado}</span>}
                            {p.tipo_prod === 'bicicleta' && p.talle && <span>• Talle {p.talle}</span>}
                            {p.tipo_prod === 'bicicleta' && p.color && <span>• {p.color}</span>}
                            {p.tipo_prod === 'bicicleta' && p.genero && <span>• {p.genero}</span>}
                            {idProveedorSel === 'todos' && p.proveedor_nombre && (
                              <span style={{ color: '#0f766e', fontWeight: '600' }}>• Prov: {p.proveedor_nombre}</span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.88rem' }}>
                          <span style={{ fontWeight: '800', color: esSinStock ? '#991b1b' : esBajoStock ? '#c2410c' : 'var(--texto-principal)' }}>
                            {cantActual}
                          </span>
                          <span style={{ color: 'var(--texto-mutado)', fontSize: '0.78rem' }}> / {stockMin}</span>
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              backgroundColor: esSinStock ? '#fee2e2' : esBajoStock ? '#fff7ed' : '#ecfdf5',
                              color: esSinStock ? '#991b1b' : esBajoStock ? '#c2410c' : '#065f46',
                              border: `1px solid ${esSinStock ? '#fca5a5' : esBajoStock ? '#fdba74' : '#a7f3d0'}`
                            }}
                          >
                            {esSinStock ? 'Agotado' : esBajoStock ? 'Reabastecer' : 'Óptimo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
