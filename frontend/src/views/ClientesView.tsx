import { useState } from 'react';
import type { Cliente } from '../types';

export function ClientesView() {
  // Mock Data inicial
  const [clientes, setClientes] = useState<Cliente[]>([
    { id_cliente: 1, Nombre: 'Juan', Apellido: 'Pérez', Dni: '12345678', Telefono: '3496-123456', Email: 'juan@email.com', Direccion: 'Calle Falsa 123' },
    { id_cliente: 2, Nombre: 'María', Apellido: 'Gómez', Dni: '87654321', Telefono: '3496-654321', Email: 'maria@email.com', Direccion: 'Av. Belgrano 789' }
  ]);

  // Estado para controlar si el modal flotante de Figma está abierto
  const [mostrarModal, setMostrarModal] = useState(false);

  // Estado para el formulario de alta
  const [nuevoCliente, setNuevoCliente] = useState<Cliente>({
    Nombre: '', Apellido: '', Dni: '', Telefono: '', Email: '', Direccion: ''
  });

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCliente.Nombre || !nuevoCliente.Apellido || !nuevoCliente.Dni) {
      alert('Por favor, completa los campos obligatorios (*)');
      return;
    }

    setClientes([...clientes, { ...nuevoCliente, id_cliente: clientes.length + 1 }]);
    setNuevoCliente({ Nombre: '', Apellido: '', Dni: '', Telefono: '', Email: '', Direccion: '' });
    setMostrarModal(false); // Cerramos el modal como en tu mockup
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      
      {/* HEADER SUPERIOR ESTILO FIGMA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Gestión de Clientes</h1>
          <p style={{ color: 'var(--texto-mutated)', fontSize: '0.9rem', marginTop: '2px' }}>Listado y registro de usuarios del sistema</p>
        </div>

        {/* Botón de Acción Principal de Figma (Negro/Azul Oscuro Redondeado) */}
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
          ➕ Registrar Cliente
        </button>
      </div>

      {/* BLOQUE DE CONTADORES SUPERIORES */}
      <div style={{ display: 'flex', gap: '15px' }}>
        <div style={{ 
          backgroundColor: 'var(--naranja-notif)', 
          padding: '12px 20px', 
          borderRadius: '12px', 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Total Clientes Registrados</span>
          <span style={{ 
            backgroundColor: '#ff9248', 
            color: '#fff', 
            padding: '2px 10px', 
            borderRadius: '20px', 
            fontWeight: '700',
            fontSize: '0.85rem'
          }}>{clientes.length}</span>
        </div>
      </div>

      {/* TABLA ESTILO FIGMA (Contenedor Blanco con Sombra y Bordes Redondos) */}
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
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DNI</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Teléfono</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id_cliente} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '500', color: 'var(--texto-principal)' }}>
                  {c.Apellido}, {c.Nombre}
                </td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.Dni}</td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.Telefono}</td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.Email}</td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', marginRight: '12px' }}>Editar</button>
                  <button style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL FLOTANTE DE REGISTRO (RECREANDO EL POP-UP DE FIGMA) */}
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Registrar Nuevo Cliente</h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Nombre *</label>
                  <input type="text" value={nuevoCliente.Nombre} onChange={e => setNuevoCliente({...nuevoCliente, Nombre: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Apellido *</label>
                  <input type="text" value={nuevoCliente.Apellido} onChange={e => setNuevoCliente({...nuevoCliente, Apellido: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>DNI *</label>
                <input type="text" value={nuevoCliente.Dni} onChange={e => setNuevoCliente({...nuevoCliente, Dni: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Teléfono</label>
                <input type="text" value={nuevoCliente.Telefono} onChange={e => setNuevoCliente({...nuevoCliente, Telefono: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Email</label>
                <input type="email" value={nuevoCliente.Email} onChange={e => setNuevoCliente({...nuevoCliente, Email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMostrarModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '10px', backgroundColor: '#fff', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}