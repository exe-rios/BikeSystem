import { useState } from 'react';
import type { Cliente } from '../types';

export function ClientesView() {
  // Estado inicial vacío - será llenado desde el backend
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<Omit<Cliente, 'id_cliente'>>({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Validaciones básicas - la lógica compleja debería estar en el backend
    if (!nuevoCliente.nombre || !nuevoCliente.apellido || !nuevoCliente.dni) {
      alert('Por favor, completa los campos obligatorios (*)');
      return;
    }

    // TODO: Hacer llamada POST a /api/clientes
    // const response = await fetch('http://localhost:3000/api/clientes', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    //   body: JSON.stringify(nuevoCliente)
    // });

    setClientes([...clientes, { ...nuevoCliente, id_cliente: clientes.length + 1 }]);
    setNuevoCliente({ nombre: '', apellido: '', dni: '', telefono: '', email: '', direccion: '' });
    setMostrarModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>

      {/* HEADER SUPERIOR ESTILO FIGMA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Gestión de Clientes</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '2px' }}>Listado y registro de usuarios del sistema</p>
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
            <tr>
              <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                No hay clientes registrados en el sistema.
              </td>
            </tr>
            {clientes.map(c => (
              <tr key={c.id_cliente} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '500', color: 'var(--texto-principal)' }}>
                  {c.apellido}, {c.nombre}
                </td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.dni}</td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.telefono}</td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.email}</td>
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
                  <input type="text" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Apellido *</label>
                  <input type="text" value={nuevoCliente.apellido} onChange={e => setNuevoCliente({ ...nuevoCliente, apellido: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>DNI *</label>
                <input type="text" value={nuevoCliente.dni} onChange={e => setNuevoCliente({ ...nuevoCliente, dni: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Teléfono *</label>
                <input type="tel" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Email *</label>
                <input type="email" value={nuevoCliente.email} onChange={e => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Dirección *</label>
                <input type="text" value={nuevoCliente.direccion} onChange={e => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', marginTop: '8px' }}>
                Registrar Cliente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
