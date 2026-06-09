import { useState } from 'react';
import type { Producto } from '../types';

export function StockView() {
  // Mock Data: Lista de repuestos y componentes iniciales
  const [productos, setProductos] = useState<Producto[]>([
    { id_producto: 1, nombre: 'Cámara rodado 29 vanila', categoria: 'Repuesto', precio_venta: 4500, cantidad: 25, stock_minimo: 10 },
    { id_producto: 2, nombre: 'Pastillas de freno Shimano B01S', categoria: 'Repuesto', precio_venta: 8900, cantidad: 3, stock_minimo: 5 }, // Alerta bajo stock
    { id_producto: 3, nombre: 'Cadena KMC 11 velocidades', categoria: 'Componente', precio_venta: 22000, cantidad: 12, stock_minimo: 4 },
    { id_producto: 4, nombre: 'Casco MTB Pro', categoria: 'Accesorio', precio_venta: 45000, cantidad: 1, stock_minimo: 3 } // Alerta bajo stock
  ]);

  // Estado para el formulario de agregar producto
  const [nuevoProducto, setNuevoProducto] = useState<Producto>({
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

    // Limpiar formulario
    setNuevoProducto({ nombre: '', categoria: 'Repuesto', precio_venta: 0, cantidad: 0, stock_minimo: 5 });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
      
      {/* --- FORMULARIO DE ALTA DE INVENTARIO --- */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', height: 'fit-content' }}>
        <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>Cargar Nuevo Artículo</h3>
        <form onSubmit={handleAgregarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>Nombre del Producto *</label>
            <input type="text" value={nuevoProducto.nombre} onChange={e => setNuevoProducto({...nuevoProducto, nombre: e.target.value})} placeholder="Ej: Cubierta Maxxis 29" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>Categoría</label>
            <select value={nuevoProducto.categoria} onChange={e => setNuevoProducto({...nuevoProducto, categoria: e.target.value as Producto['categoria']})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="Repuesto">Repuesto</option>
              <option value="Componente">Componente</option>
              <option value="Accesorio">Accesorio</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>Precio de Venta ($) *</label>
            <input type="number" value={nuevoProducto.precio_venta} onChange={e => setNuevoProducto({...nuevoProducto, precio_venta: Number(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>Stock Inicial</label>
              <input type="number" value={nuevoProducto.cantidad} onChange={e => setNuevoProducto({...nuevoProducto, cantidad: Number(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>Stock Mínimo</label>
              <input type="number" value={nuevoProducto.stock_minimo} onChange={e => setNuevoProducto({...nuevoProducto, stock_minimo: Number(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
          </div>

          <button type="submit" style={{ padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
            Ingresar a Inventario
          </button>
        </form>
      </div>

      {/* --- TABLA DE MONITOREO DE STOCK (RF22) --- */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>Control de Existencias</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Producto</th>
              <th style={{ padding: '12px' }}>Categoría</th>
              <th style={{ padding: '12px' }}>Precio</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Cant. Actual</th>
              <th style={{ padding: '12px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(p => {
              // Validamos la condición del RF22: Alerta por bajo stock
              const esBajoStock = p.cantidad <= p.stock_minimo;

              return (
                <tr key={p.id_producto} style={{ borderBottom: '1px solid #edf2f7', backgroundColor: esBajoStock ? '#fff5f5' : 'transparent' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{p.nombre}</td>
                  <td style={{ padding: '12px' }}><span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{p.categoria}</span></td>
                  <td style={{ padding: '12px' }}>${p.precio_venta.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: esBajoStock ? '#e11d48' : '#334155' }}>
                    {p.cantidad} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8' }}>/ min: {p.stock_minimo}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
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

    </div>
  );
}