import { useState, useEffect } from 'react';
import type { Producto } from '../types';
import { api } from '../services/api';

export function StockView() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal State for Editing
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState<Omit<Producto, 'id_producto'>>({
    nombre: '',
    marca: '',
    modelo: '',
    tipo_prod: 'repuesto',
    cantidad: 1,
    precio: 0,
    stock_minimo: 5,
    numero_serie: '',
    color: '',
    rodado: '29',
    talle: 'M'
  });

  const cargarProductos = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.productos.getAll();
      setProductos(data.productos || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar el inventario');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleAgregarProducto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nuevoProducto.nombre.trim() || nuevoProducto.precio <= 0) {
      alert('Por favor ingresa un nombre válido y un precio mayor a cero.');
      return;
    }

    if (nuevoProducto.tipo_prod === 'bicicleta' && !nuevoProducto.numero_serie?.trim()) {
      alert('Por favor ingresa el número de serie / cuadro para la bicicleta.');
      return;
    }

    setGuardando(true);
    try {
      await api.productos.create(nuevoProducto);
      alert('Artículo agregado al inventario exitosamente');
      setNuevoProducto({
        nombre: '',
        marca: '',
        modelo: '',
        tipo_prod: 'repuesto',
        cantidad: 1,
        precio: 0,
        stock_minimo: 5,
        numero_serie: '',
        color: '',
        rodado: '29',
        talle: 'M'
      });
      await cargarProductos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al guardar producto: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const abrirModalEditar = (p: Producto) => {
    setProductoEditando(p);
    setMostrarModalEditar(true);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoEditando || !productoEditando.id_producto) return;

    setGuardando(true);
    try {
      await api.productos.update(productoEditando.id_producto, productoEditando);
      alert('Producto actualizado correctamente');
      setMostrarModalEditar(false);
      setProductoEditando(null);
      await cargarProductos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al actualizar: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarProducto = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar "${nombre}" del inventario?`)) {
      return;
    }

    try {
      await api.productos.delete(id);
      alert('Producto eliminado');
      await cargarProductos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`No se pudo eliminar: ${err.message}`);
      }
    }
  };

  // Filtrado robusto insensible a mayúsculas y espacios
  const productosFiltrados = productos.filter(p => {
    const prodTipo = (p.tipo_prod || '').toLowerCase().trim();
    const filtro = filtroTipo.toLowerCase().trim();
    const cumpleFiltro = filtro === 'todos' || prodTipo.startsWith(filtro) || filtro.startsWith(prodTipo);

    const termino = busqueda.toLowerCase().trim();
    const cumpleBusqueda =
      termino === '' ||
      (p.nombre && p.nombre.toLowerCase().includes(termino)) ||
      (p.marca && p.marca.toLowerCase().includes(termino)) ||
      (p.modelo && p.modelo.toLowerCase().includes(termino)) ||
      (p.numero_serie && p.numero_serie.toLowerCase().includes(termino)) ||
      (p.tipo_prod && p.tipo_prod.toLowerCase().includes(termino));

    return cumpleFiltro && cumpleBusqueda;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>

      {/* --- FORMULARIO DE ALTA DE INVENTARIO --- */}
      <div style={{
        background: 'var(--bg-tarjeta)',
        padding: '24px',
        borderRadius: '14px',
        border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
        height: 'fit-content'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
          Cargar Nuevo Artículo
        </h3>

        <form onSubmit={handleAgregarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Tipo de Artículo *</label>
            <select
              value={nuevoProducto.tipo_prod}
              onChange={e => setNuevoProducto({ ...nuevoProducto, tipo_prod: e.target.value as 'repuesto' | 'bicicleta' | 'accesorio' | 'componente' })}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem'
              }}
            >
              <option value="repuesto">Repuesto</option>
              <option value="bicicleta">Bicicleta Nueva</option>
              <option value="accesorio">Accesorio</option>
              <option value="componente">Componente</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Nombre del Producto *</label>
            <input
              type="text"
              value={nuevoProducto.nombre}
              onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
              placeholder={nuevoProducto.tipo_prod === 'bicicleta' ? 'Ej: Bicicleta Mountain Bike' : 'Ej: Cubierta Maxxis 29'}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Marca</label>
              <input
                type="text"
                placeholder="Ej: Shimano / Vairo"
                value={nuevoProducto.marca || ''}
                onChange={e => setNuevoProducto({ ...nuevoProducto, marca: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Modelo</label>
              <input
                type="text"
                placeholder="Ej: Deore / XR 3.8"
                value={nuevoProducto.modelo || ''}
                onChange={e => setNuevoProducto({ ...nuevoProducto, modelo: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* CAMPOS ESPECÍFICOS PARA BICICLETAS NUEVAS */}
          {nuevoProducto.tipo_prod === 'bicicleta' && (
            <div style={{
              backgroundColor: 'rgba(37, 99, 235, 0.05)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--azul-oscuro)' }}>
                Especificaciones
              </span>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.8rem' }}>N° Serie / Cuadro *</label>
                <input
                  type="text"
                  placeholder="Ej: SN-9482019"
                  value={nuevoProducto.numero_serie || ''}
                  onChange={e => setNuevoProducto({ ...nuevoProducto, numero_serie: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--borde-input)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.8rem' }}>Color</label>
                  <input
                    type="text"
                    placeholder="Color"
                    value={nuevoProducto.color || ''}
                    onChange={e => setNuevoProducto({ ...nuevoProducto, color: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--borde-input)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.8rem' }}>Rodado</label>
                  <select
                    value={nuevoProducto.rodado || ''}
                    onChange={e => setNuevoProducto({ ...nuevoProducto, rodado: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--borde-input)', fontSize: '0.85rem', backgroundColor: '#fff' }}
                  >
                    <option value="26">26</option>
                    <option value="27.5">27.5</option>
                    <option value="29">29</option>
                    <option value="700c">700c</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.8rem' }}>Talle</label>
                  <select
                    value={nuevoProducto.talle || ''}
                    onChange={e => setNuevoProducto({ ...nuevoProducto, talle: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--borde-input)', fontSize: '0.85rem', backgroundColor: '#fff' }}
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Precio de Venta ($) *</label>
            <input
              type="number"
              min="0"
              value={nuevoProducto.precio || ''}
              onChange={e => setNuevoProducto({ ...nuevoProducto, precio: Number(e.target.value) })}
              placeholder="0.00"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Stock Inicial</label>
              <input
                type="number"
                min="0"
                value={nuevoProducto.cantidad}
                onChange={e => setNuevoProducto({ ...nuevoProducto, cantidad: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Stock Mínimo</label>
              <input
                type="number"
                min="0"
                value={nuevoProducto.stock_minimo}
                onChange={e => setNuevoProducto({ ...nuevoProducto, stock_minimo: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            style={{
              padding: '12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: guardando ? 'not-allowed' : 'pointer',
              marginTop: '6px',
              fontSize: '0.95rem',
              opacity: guardando ? 0.7 : 1
            }}
          >
            {guardando ? 'Guardando...' : 'Ingresar a Inventario'}
          </button>
        </form>
      </div>

      {/* --- TABLA DE MONITOREO DE STOCK --- */}
      <div style={{
        background: 'var(--bg-tarjeta)',
        padding: '24px',
        borderRadius: '14px',
        border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>
              Control de Existencias
            </h2>
            <p style={{ color: 'var(--texto-mutado)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Inventario general y disponibilidad en tiempo real ({productosFiltrados.length} artículos)
            </p>
          </div>

          {/* Filtros de Categoría Funcionales */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['todos', 'bicicleta', 'repuesto', 'accesorio', 'componente'].map(tipo => (
              <button
                key={tipo}
                type="button"
                onClick={() => setFiltroTipo(tipo)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  backgroundColor: filtroTipo === tipo ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                  color: filtroTipo === tipo ? '#fff' : 'var(--texto-mutado)',
                  transition: 'all 0.15s ease'
                }}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        {/* Buscador Rápido */}
        <input
          type="text"
          placeholder="Buscar por nombre, marca, modelo, N° de serie o tipo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-principal)',
            color: 'var(--texto-principal)',
            fontSize: '0.9rem'
          }}
        />

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div style={{ border: '1px solid var(--borde-input)', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Producto / Rodado</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Precio</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'center' }}>Stock</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                    Cargando inventario...
                  </td>
                </tr>
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                    No se encontraron artículos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                productosFiltrados.map(p => {
                  const esBajoStock = p.cantidad <= p.stock_minimo;
                  return (
                    <tr key={p.id_producto} style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: esBajoStock ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--texto-principal)' }}>{p.nombre}</div>
                        {(p.marca || p.modelo) && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>
                            {p.marca} {p.modelo}
                          </div>
                        )}
                        {p.tipo_prod === 'bicicleta' && p.numero_serie && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--azul-oscuro)', fontFamily: 'monospace', fontWeight: '600' }}>
                            SN: {p.numero_serie} {p.rodado ? `(R${p.rodado})` : ''} {p.talle ? `[${p.talle}]` : ''}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'capitalize',
                          backgroundColor: p.tipo_prod === 'bicicleta' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-principal)',
                          color: p.tipo_prod === 'bicicleta' ? '#2563eb' : 'var(--texto-principal)'
                        }}>
                          {p.tipo_prod}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--texto-principal)' }}>
                        ${Number(p.precio).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: esBajoStock ? '#ef4444' : 'var(--texto-principal)' }}>
                        {p.cantidad} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--texto-mutado)' }}>/ min {p.stock_minimo}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {esBajoStock ? (
                          <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                            REABASTECER
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                            Óptimo
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => abrirModalEditar(p)}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', marginRight: '10px' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => p.id_producto && handleEliminarProducto(p.id_producto, p.nombre)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE PRODUCTO */}
      {mostrarModalEditar && productoEditando && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '480px', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>Editar Artículo de Stock</h3>
              <button onClick={() => setMostrarModalEditar(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Nombre *</label>
                <input
                  type="text"
                  value={productoEditando.nombre}
                  onChange={e => setProductoEditando({ ...productoEditando, nombre: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Marca</label>
                  <input
                    type="text"
                    value={productoEditando.marca || ''}
                    onChange={e => setProductoEditando({ ...productoEditando, marca: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Modelo</label>
                  <input
                    type="text"
                    value={productoEditando.modelo || ''}
                    onChange={e => setProductoEditando({ ...productoEditando, modelo: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Precio de Venta ($) *</label>
                <input
                  type="number"
                  min="0"
                  value={productoEditando.precio}
                  onChange={e => setProductoEditando({ ...productoEditando, precio: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Cantidad en Stock *</label>
                  <input
                    type="number"
                    min="0"
                    value={productoEditando.cantidad}
                    onChange={e => setProductoEditando({ ...productoEditando, cantidad: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Stock Mínimo *</label>
                  <input
                    type="number"
                    min="0"
                    value={productoEditando.stock_minimo}
                    onChange={e => setProductoEditando({ ...productoEditando, stock_minimo: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMostrarModalEditar(false)} style={{ flex: 1, padding: '11px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ flex: 2, padding: '11px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Actualizando...' : 'Actualizar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
