import { useState } from 'react';
import type { Bicicleta, Cliente } from '../types';

export function BicicletasView() {
  // TODO: Cargar clientes desde backend GET /api/clientes
  const clientes: Cliente[] = [];

  // Estado inicial vacío - será llenado desde el backend
  const [bicicletas, setBicicletas] = useState<Bicicleta[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaBici, setNuevaBici] = useState<Omit<Bicicleta, 'id_bicicleta'>>({
    id_cliente: 0,
    numero_serie: '',
    marca: '',
    modelo: '',
    color: '',
    rodado: '29',
    talle: 'M',
    precio: 0
  });

  // Auxiliar para mostrar el nombre del dueño en la tabla
  const obtenerNombreDueno = (id_cl: number) => {
    const c = clientes.find(item => item.id_cliente === id_cl);
    return c ? `${c.apellido}, ${c.nombre}` : 'Sin dueño';
  };

  const handleGuardarBici = (e: React.FormEvent) => {
    e.preventDefault();

    if (nuevaBici.id_cliente === 0 || !nuevaBici.marca || !nuevaBici.modelo || !nuevaBici.numero_serie) {
      alert('Por favor, completa los campos obligatorios (*) y asigna un dueño.');
      return;
    }

    setBicicletas([...bicicletas, { ...nuevaBici, id_bicicleta: bicicletas.length + 1 }]);

    // Resetear formulario
    setNuevaBici({ id_cliente: 0, numero_serie: '', marca: '', modelo: '', color: '', rodado: '29', talle: 'M', precio: 0 });
    setMostrarModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* HEADER SUPERIOR ESTILO FIGMA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Gestión de Bicicletas</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '2px' }}>Registro de rodados asociados a clientes</p>
        </div>

        <button
          onClick={() => setMostrarModal(true)}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: '10px', fontWeight: '600',
            fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          ➕ Registrar Bicicleta
        </button>
      </div>

      {/* BLOQUE DE CONTADORES SUPERIORES */}
      <div style={{ display: 'flex', gap: '15px' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)', padding: '12px 20px', borderRadius: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Bicicletas en Sistema</span>
          <span style={{
            backgroundColor: '#ff9248', color: '#fff', padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
          }}>{bicicletas.length}</span>
        </div>
      </div>

      {/* TABLA DE CONTENIDO BLANCA */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Dueño / Cliente</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Marca / Modelo</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>N° Serie</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Especificaciones</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bicicletas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  No hay bicicletas registradas en el sistema.
                </td>
              </tr>
            ) : (
              bicicletas.map(b => (
                <tr key={b.id_bicicleta} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
                    {obtenerNombreDueno(b.id_cliente)}
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-principal)' }}>
                    {b.marca} <span style={{ color: 'var(--texto-mutado)', fontWeight: 'normal' }}>{b.modelo}</span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)', fontFamily: 'monospace' }}>{b.numero_serie}</td>
                  <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                    <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', color: '#475569', marginRight: '5px' }}>R{b.rodado}</span>
                    <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', color: '#475569' }}>Talle {b.talle}</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', marginRight: '12px' }}>Editar</button>
                    <button style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL FLOTANTE: REGISTRAR BICICLETA (POPUPS DE FIGMA) */}
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '520px', padding: '30px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Registrar nueva bicicleta</h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleGuardarBici} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Asignar Dueño / Cliente *</label>
                <select
                  value={nuevaBici.id_cliente}
                  onChange={e => setNuevaBici({ ...nuevaBici, id_cliente: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: '#fff' }}
                >
                  <option value={0}>-- Seleccionar Cliente Responsable --</option>
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>{c.apellido}, {c.nombre} (DNI: {c.dni})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Marca *</label>
                  <input type="text" placeholder="Ej: Vairo" value={nuevaBici.marca} onChange={e => setNuevaBici({ ...nuevaBici, marca: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Modelo *</label>
                  <input type="text" placeholder="Ej: XR 4.0" value={nuevaBici.modelo} onChange={e => setNuevaBici({ ...nuevaBici, modelo: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Número de Serie / Cuadro *</label>
                <input type="text" placeholder="Código grabado en el cuadro" value={nuevaBici.numero_serie} onChange={e => setNuevaBici({ ...nuevaBici, numero_serie: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Color</label>
                  <input type="text" placeholder="Gris/Rojo" value={nuevaBici.color} onChange={e => setNuevaBici({ ...nuevaBici, color: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Rodado</label>
                  <select value={nuevaBici.rodado} onChange={e => setNuevaBici({ ...nuevaBici, rodado: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: '#fff' }}>
                    <option value="26">26</option>
                    <option value="27.5">27.5</option>
                    <option value="29">29</option>
                    <option value="700c">700c (Ruta)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Talle</label>
                  <select value={nuevaBici.talle} onChange={e => setNuevaBici({ ...nuevaBici, talle: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: '#fff' }}>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '15px' }}>
                <button type="button" onClick={() => setMostrarModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '10px', backgroundColor: '#fff', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Guardar Bicicleta</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}