import { useState } from 'react';
import type { Producto } from '../types';

export function StockView() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState<Omit<Producto, 'id_producto'>>({
    nombre: '',
    categoria: 'Repuesto',
    precio_venta: 0,
    cantidad: 0,
    stock_minimo: 5
  });

  const handleAgregarProducto = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nuevoProducto.nombre || nuevoProducto.precio_venta <= 0) {
      alert('Por favor ingresa un nombre válido y un precio mayor a cero.');
      return;
    }

    setProductos([
      ...productos,
      { ...nuevoProducto, id_producto: productos.length + 1 }
    ]);

    setNuevoProducto({ nombre: '', categoria: 'Repuesto', precio_venta: 0, cantidad: 0, stock_minimo: 5 });
    setMostrarModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>

      {/* HEADER SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Gestión de Stock</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '2px' }}>Control de existencias e inventario del taller</p>
        </div>

        <button
          onClick={() => setMostrarModal(true)}
          style={{
            backgroundColor: 'var(--azul-oscuro)',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s'
          }}
        >
          ➕ Cargar Nuevo Artículo
        </button>
      </div>

      {/* BLOQUE DE CONTADORES */}
      <div style={{ display: 'flex', gap: '15px' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)',
          padding: '12px 20px',
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Total Artículos Registrados</span>
          <span style={{
            backgroundColor: '#ff9248',
            color: '#fff',
            padding: '2px 10px',
            borderRadius: '20px',
            fontWeight: '700',
            fontSize: '0.85rem'
          }}>{productos.length}</span>
        </div>
      </div>

      {/* TABLA DE MONITOREO DE STOCK */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        borderRadius: '14px',
        border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Producto</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoría</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Precio</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Cant. Actual</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  No hay artículos registrados en el inventario.
                </td>
              </tr>
            )}
            {productos.map(p => {
              const esBajoStock = p.cantidad <= p.stock_minimo;

              return (
                <tr key={p.id_producto} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: esBajoStock ? '#fff5f5' : 'transparent' }}>
                  <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '500', color: 'var(--texto-principal)' }}>{p.nombre}</td>
                  <td style={{ padding: '16px' }}><span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{p.categoria}</span></td>
                  <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-principal)' }}>${p.precio_venta.toLocaleString()}</td>
                  <td style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', color: esBajoStock ? '#e11d48' : 'var(--texto-principal)' }}>
                    {p.cantidad} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--texto-mutado)' }}>/ min: {p.stock_minimo}</span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {esBajoStock ? (
                      <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        ⚠️ REABASTECER
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        ✓ Óptimo
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL FLOTANTE DE CARGA DE ARTÍCULO */}
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '480px', padding: '30px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Cargar Nuevo Artículo</h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleAgregarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Nombre del Producto *</label>
                <input type="text" value={nuevoProducto.nombre} onChange={e => setNuevoProducto({...nuevoProducto, nombre: e.target.value})} placeholder="Ej: Cubierta Maxxis 29" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Categoría</label>
                <select value={nuevoProducto.categoria} onChange={e => setNuevoProducto({...nuevoProducto, categoria: e.target.value as Producto['categoria']})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', fontSize: '0.9rem' }}>
                  <option value="Repuesto">Repuesto</option>
                  <option value="Accesorio">Accesorio</option>
                  <option value="Bicicleta">Bicicleta</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Precio de Venta ($) *</label>
                <input type="number" value={nuevoProducto.precio_venta} onChange={e => setNuevoProducto({...nuevoProducto, precio_venta: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Stock Inicial</label>
                  <input type="number" value={nuevoProducto.cantidad} onChange={e => setNuevoProducto({...nuevoProducto, cantidad: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Stock Mínimo</label>
                  <input type="number" value={nuevoProducto.stock_minimo} onChange={e => setNuevoProducto({...nuevoProducto, stock_minimo: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--boinput)', fontSize: '0.9rem' }} />
                </div>
              </div>

              <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', marginTop: '8px' }}>
                Ingresar a Inventario
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
