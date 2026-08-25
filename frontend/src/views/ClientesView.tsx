import { useState, useEffect } from 'react';
import type { Cliente } from '../types';
import { api } from '../services/api';

interface ErroresFormulario {
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  email?: string;
}

export function ClientesView() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Modal State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  const [formData, setFormData] = useState<Omit<Cliente, 'id_cliente'>>({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  const [erroresForm, setErroresForm] = useState<ErroresFormulario>({});

  const cargarClientes = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.clientes.getAll();
      // Compatibilidad si la API devuelve un array directamente o { clientes: [...] }
      const lista = Array.isArray(data) ? data : (data?.clientes || []);
      setClientes(lista);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar la lista de clientes');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const resetFormulario = () => {
    setFormData({
      nombre: '',
      apellido: '',
      dni: '',
      telefono: '',
      email: '',
      direccion: ''
    });
    setErroresForm({});
    setErrorModal(null);
  };

  const abrirModalNuevo = () => {
    setClienteEditando(null);
    resetFormulario();
    setMostrarModal(true);
  };

  const abrirModalEditar = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setFormData({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      dni: cliente.dni,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    });
    setErroresForm({});
    setErrorModal(null);
    setMostrarModal(true);
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: ErroresFormulario = {};

    if (!formData.nombre.trim() || formData.nombre.trim().length < 2) {
      nuevosErrores.nombre = 'El nombre es obligatorio (mínimo 2 caracteres).';
    }

    if (!formData.apellido.trim() || formData.apellido.trim().length < 2) {
      nuevosErrores.apellido = 'El apellido es obligatorio (mínimo 2 caracteres).';
    }

    const dniLimpio = formData.dni.trim();
    if (!/^\d{7,8}$/.test(dniLimpio)) {
      nuevosErrores.dni = 'El DNI debe tener 7 u 8 dígitos sin puntos.';
    }

    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nuevosErrores.email = 'El formato de correo no es válido.';
    }

    if (formData.telefono && formData.telefono.trim() && !/^\+?\d{7,15}$/.test(formData.telefono.trim())) {
      nuevosErrores.telefono = 'Ingrese un número válido (7 a 15 dígitos).';
    }

    setErroresForm(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);

    if (!validarFormulario()) return;

    setGuardando(true);
    try {
      if (clienteEditando?.id_cliente) {
        await api.clientes.update(clienteEditando.id_cliente, formData);
      } else {
        await api.clientes.create(formData);
      }
      setMostrarModal(false);
      await cargarClientes();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorModal(err.message);
      } else {
        setErrorModal('Ocurrió un error inesperado al guardar el cliente');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id_cliente: number, nombreCompleto: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al cliente "${nombreCompleto}"?`)) {
      return;
    }

    try {
      await api.clientes.delete(id_cliente);
      await cargarClientes();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`No se pudo eliminar: ${err.message}`);
      }
    }
  };

  const clientesFiltrados = clientes.filter(c => {
    const termino = busqueda.toLowerCase();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(termino)) ||
      (c.apellido && c.apellido.toLowerCase().includes(termino)) ||
      (c.dni && c.dni.toLowerCase().includes(termino)) ||
      (c.telefono && c.telefono.toLowerCase().includes(termino))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>

      {/* HEADER SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Gestión de Clientes</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '2px' }}>Listado y registro de usuarios del sistema</p>
        </div>

        <button
          onClick={abrirModalNuevo}
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
          Registrar Cliente
        </button>
      </div>

      {/* CONTADORES Y BUSCADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
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

        <input
          type="text"
          placeholder="Buscar por nombre, apellido, DNI..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)',
            color: 'var(--texto-principal)',
            width: '320px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* ERROR BANNER EN PANTALLA */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid #ef4444',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* TABLA ESTILO FIGMA */}
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
            {cargando ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  Cargando clientes desde el servidor...
                </td>
              </tr>
            ) : clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  {clientes.length === 0 ? 'No hay clientes registrados en el sistema.' : 'No se encontraron clientes que coincidan con la búsqueda.'}
                </td>
              </tr>
            ) : (
              clientesFiltrados.map(c => (
                <tr key={c.id_cliente} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '500', color: 'var(--texto-principal)' }}>
                    {c.apellido}, {c.nombre}
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.dni}</td>
                  <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.telefono || '-'}</td>
                  <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.email || '-'}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => abrirModalEditar(c)}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', marginRight: '12px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => c.id_cliente && handleEliminar(c.id_cliente, `${c.nombre} ${c.apellido}`)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE REGISTRO / EDICIÓN */}
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                {clienteEditando ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            {errorModal && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '16px'
              }}>
                {errorModal}
              </div>
            )}

            <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: `1px solid ${erroresForm.nombre ? '#ef4444' : 'var(--borde-input)'}`,
                      fontSize: '0.9rem', boxSizing: 'border-box'
                    }}
                  />
                  {erroresForm.nombre && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.nombre}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Apellido *</label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: `1px solid ${erroresForm.apellido ? '#ef4444' : 'var(--borde-input)'}`,
                      fontSize: '0.9rem', boxSizing: 'border-box'
                    }}
                  />
                  {erroresForm.apellido && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.apellido}</span>}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>DNI *</label>
                <input
                  type="text"
                  value={formData.dni}
                  onChange={e => setFormData({ ...formData, dni: e.target.value })}
                  placeholder="Ej: 40123456"
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: `1px solid ${erroresForm.dni ? '#ef4444' : 'var(--borde-input)'}`,
                    fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
                {erroresForm.dni && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.dni}</span>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ej: 3421234567"
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: `1px solid ${erroresForm.telefono ? '#ef4444' : 'var(--borde-input)'}`,
                    fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
                {erroresForm.telefono && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.telefono}</span>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@correo.com"
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: `1px solid ${erroresForm.email ? '#ef4444' : 'var(--borde-input)'}`,
                    fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
                {erroresForm.email && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.email}</span>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: '1px solid var(--borde-input)',
                    fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--borde-input)',
                    borderRadius: '8px',
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
                    padding: '12px',
                    backgroundColor: 'var(--azul-oscuro)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '1rem',
                    cursor: guardando ? 'not-allowed' : 'pointer',
                    opacity: guardando ? 0.7 : 1
                  }}
                >
                  {guardando ? 'Guardando...' : (clienteEditando ? 'Actualizar Cliente' : 'Registrar Cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}