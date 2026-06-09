import { useState } from 'react';
import type { Cliente } from '../types';


export function ClientesView() {
  // Mock Data: Datos de prueba provisionales con la estructura exacta de tu DDL
  const [clientes, setClientes] = useState<Cliente[]>([
    { id_cliente: 1, Nombre: 'Juan', Apellido: 'Pérez', Dni: '12345678', Telefono: '3496-123456', Email: 'juan@email.com', Direccion: 'Calle Falsa 123' },
    { id_cliente: 2, Nombre: 'María', Apellido: 'Gómez', Dni: '87654321', Telefono: '3496-654321', Email: 'maria@email.com', Direccion: 'Av. Belgrano 789' }
  ]);

  // Estado para la barra de búsqueda (RF4 - Buscar Cliente)
  const [busqueda, setBusqueda] = useState('');

  // Estado para controlar el formulario de nuevo cliente
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<Cliente>({
    Nombre: '',
    Apellido: '',
    Dni: '',
    Telefono: '',
    Email: '',
    Direccion: ''
  });

  // Filtrar clientes según lo que el usuario escribe en el buscador (RF4)
  const clientesFiltrados = clientes.filter(cliente => 
    cliente.Nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    cliente.Apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
    cliente.Dni.includes(busqueda)
  );

  // Función para manejar el envío del formulario (CU02 - Registrar Cliente)
  const handleGuardarCliente = (e: React.FormEvent) => {
    e.preventDefault();
    // Validamos que los campos obligatorios según el DDL no estén vacíos
    if (!nuevoCliente.Nombre || !nuevoCliente.Apellido || !nuevoCliente.Dni) {
      alert('Por favor, completa los campos obligatorios (Nombre, Apellido, DNI).');
      return;
    }

    const clienteParaGuardar = {
      ...nuevoCliente,
      id_cliente: clientes.length + 1 // ID temporal para simular la base de datos
    };

    setClientes([...clientes, clienteParaGuardar]);
    setMostrarFormulario(false);
    // Limpiamos el formulario
    setNuevoCliente({ Nombre: '', Apellido: '', Dni: '', Telefono: '', Email: '', Direccion: '' });
  };

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', justifyContent: 'space-between' }}>
        <h2>Gestión de Clientes</h2>
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          style={{ padding: '10px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {mostrarFormulario ? 'Volver al Listado' : '＋ Registrar Nuevo Cliente'}
        </button>
      </div>

      {/* --- FORMULARIO DE REGISTRO (CU02 / RF1) --- */}
      {mostrarFormulario ? (
        <form onSubmit={handleGuardarCliente} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre *</label>
            <input type="text" value={nuevoCliente.Nombre} onChange={e => setNuevoCliente({...nuevoCliente, Nombre: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Apellido *</label>
            <input type="text" value={nuevoCliente.Apellido} onChange={e => setNuevoCliente({...nuevoCliente, Apellido: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>DNI *</label>
            <input type="text" value={nuevoCliente.Dni} onChange={e => setNuevoCliente({...nuevoCliente, Dni: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Teléfono</label>
            <input type="text" value={nuevoCliente.Telefono} onChange={e => setNuevoCliente({...nuevoCliente, Telefono: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
            <input type="email" value={nuevoCliente.Email} onChange={e => setNuevoCliente({...nuevoCliente, Email: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Dirección</label>
            <input type="text" value={nuevoCliente.Direccion} onChange={e => setNuevoCliente({...nuevoCliente, Direccion: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <button type="submit" style={{ gridColumn: 'span 2', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
            Guardar Cliente en Sistema
          </button>
        </form>
      ) : (
        /* --- TABLA DE CONSULTA Y BUSCADOR (CU01 / RF4) --- */
        <div>
          <div style={{ marginBottom: '15px' }}>
            <input 
              type="text" 
              placeholder="Buscar cliente por Nombre, Apellido o DNI..." 
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
            />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Nombre Completo</th>
                <th style={{ padding: '12px' }}>DNI</th>
                <th style={{ padding: '12px' }}>Teléfono</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Dirección</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(cliente => (
                <tr key={cliente.id_cliente} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '12px' }}>{cliente.id_cliente}</td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{cliente.Apellido}, {cliente.Nombre}</td>
                  <td style={{ padding: '12px' }}>{cliente.Dni}</td>
                  <td style={{ padding: '12px' }}>{cliente.Telefono}</td>
                  <td style={{ padding: '12px' }}>{cliente.Email}</td>
                  <td style={{ padding: '12px' }}>{cliente.Direccion}</td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>No se encontraron clientes que coincidan con la búsqueda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}