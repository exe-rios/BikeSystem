import { useState } from 'react';
import type { Bicicleta, Cliente } from '../types';

export function BicicletasView() {
  // Datos de prueba simulados de Clientes (los mismos que el módulo anterior)
  const clientesRegistrados: Cliente[] = [
    { id_cliente: 1, Nombre: 'Juan', Apellido: 'Pérez', Dni: '12345678', Telefono: '3496-123456', Email: 'juan@email.com', Direccion: 'Calle Falsa 123' },
    { id_cliente: 2, Nombre: 'María', Apellido: 'Gómez', Dni: '87654321', Telefono: '3496-654321', Email: 'maria@email.com', Direccion: 'Av. Belgrano 789' }
  ];

  // Datos de prueba simulados para Bicicletas (siguiendo tu Modelo Lógico)
  const [bicicletas, setBicicletas] = useState<Bicicleta[]>([
    { id_bicicleta: 1, id_cliente: 1, Num_serie: 'SN-998822', marca: 'Vairo', modelo: 'XR 3.8', color: 'Negro/Verde', rodado: '29', talle: 'M', Precio: 450000 },
    { id_bicicleta: 2, id_cliente: 2, Num_serie: 'SN-112233', marca: 'Venzo', modelo: 'Amphion', color: 'Rojo', rodado: '29', talle: 'S', Precio: 520000 }
  ]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Estado del formulario para nueva bicicleta
  const [nuevaBici, setNuevaBici] = useState<Bicicleta>({
    id_cliente: 0, // 0 significa que aún no se seleccionó propietario
    Num_serie: '',
    marca: '',
    modelo: '',
    color: '',
    rodado: '',
    talle: '',
    Precio: 0
  });

  // Función para obtener el nombre del propietario de manera dinámica en la tabla
  const obtenerPropietario = (id_cliente: number) => {
    const cliente = clientesRegistrados.find(c => c.id_cliente === id_cliente);
    return cliente ? `${cliente.Apellido}, ${cliente.Nombre}` : 'Desconocido';
  };

  // Filtrar bicicletas por marca, modelo o número de serie (CU05)
  const bicisFiltradas = bicicletas.filter(bici => 
    bici.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
    bici.modelo.toLowerCase().includes(busqueda.toLowerCase()) ||
    bici.Num_serie.includes(busqueda)
  );

  const handleGuardarBici = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaBici.id_cliente === 0 || !nuevaBici.Num_serie || !nuevaBici.marca) {
      alert('Por favor, completa los campos obligatorios y selecciona un propietario.');
      return;
    }

    const biciParaGuardar = {
      ...nuevaBici,
      id_bicicleta: bicicletas.length + 1
    };

    setBicicletas([...bicicletas, biciParaGuardar]);
    setMostrarFormulario(false);
    // Reiniciar formulario
    setNuevaBici({ id_cliente: 0, Num_serie: '', marca: '', modelo: '', color: '', rodado: '', talle: '', Precio: 0 });
  };

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Gestión de Bicicletas</h2>
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          style={{ padding: '10px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {mostrarFormulario ? 'Volver al Listado' : '＋ Registrar Nueva Bicicleta'}
        </button>
      </div>

      {/* --- FORMULARIO DE REGISTRO (CU06 / RF6) --- */}
      {mostrarFormulario ? (
        <form onSubmit={handleGuardarBici} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          
          {/* SELECCIÓN DE PROPIETARIO (Cumple la FK restrictiva del DDL) */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Propietario / Cliente *</label>
            <select 
              value={nuevaBici.id_cliente} 
              onChange={e => setNuevaBici({...nuevaBici, id_cliente: Number(e.target.value)})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}
            >
              <option value={0}>-- Selecciona el dueño de la bicicleta --</option>
              {clientesRegistrados.map(c => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.Apellido}, {c.Nombre} (DNI: {c.Dni})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Número de Serie *</label>
            <input type="text" value={nuevaBici.Num_serie} onChange={e => setNuevaBici({...nuevaBici, Num_serie: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Marca *</label>
            <input type="text" value={nuevaBici.marca} onChange={e => setNuevaBici({...nuevaBici, marca: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Modelo</label>
            <input type="text" value={nuevaBici.modelo} onChange={e => setNuevaBici({...nuevaBici, modelo: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Color</label>
            <input type="text" value={nuevaBici.color} onChange={e => setNuevaBici({...nuevaBici, color: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rodado</label>
            <input type="text" placeholder="Ej: 29, 26" value={nuevaBici.rodado} onChange={e => setNuevaBici({...nuevaBici, rodado: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Talle</label>
            <input type="text" placeholder="Ej: S, M, L" value={nuevaBici.talle} onChange={e => setNuevaBici({...nuevaBici, talle: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Precio Estimado (Arriendo/Valor)</label>
            <input type="number" value={nuevaBici.Precio} onChange={e => setNuevaBici({...nuevaBici, Precio: Number(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <button type="submit" style={{ gridColumn: 'span 2', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
            Asociar y Registrar Bicicleta
          </button>
        </form>
      ) : (
        /* --- TABLA DE LISTADO (CU05) --- */
        <div>
          <div style={{ marginBottom: '15px' }}>
            <input 
              type="text" 
              placeholder="Buscar bicicleta por Marca, Modelo o N° de Serie..." 
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
            />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>N° Serie</th>
                <th style={{ padding: '12px' }}>Marca / Modelo</th>
                <th style={{ padding: '12px' }}>Detalles (Rodado/Talle)</th>
                <th style={{ padding: '12px' }}>Propietario</th>
              </tr>
            </thead>
            <tbody>
              {bicisFiltradas.map(bici => (
                <tr key={bici.id_bicicleta} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}>{bici.Num_serie}</td>
                  <td style={{ padding: '12px' }}>{bici.marca} {bici.modelo} <span style={{ fontSize: '0.85rem', color: '#718096' }}>({bici.color})</span></td>
                  <td style={{ padding: '12px' }}>R: {bici.rodado} / T: {bici.talle}</td>
                  <td style={{ padding: '12px', color: '#1e3a8a', fontWeight: '500' }}>{obtenerPropietario(bici.id_cliente)}</td>
                </tr>
              ))}
              {bicisFiltradas.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>No hay bicicletas registradas con esos criterios.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}