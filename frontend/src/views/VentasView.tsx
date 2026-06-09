import { useState } from 'react';
import type { Venta, Reparacion, Bicicleta, Cliente } from '../types';

export function VentasView() {
  // Datos simulados compartidos del sistema
  const clientes: Cliente[] = [
    { id_cliente: 1, Nombre: 'Juan', Apellido: 'Pérez', Dni: '12345678', Telefono: '3496-123456', Email: 'juan@email.com', Direccion: 'Calle Falsa 123' },
    { id_cliente: 2, Nombre: 'María', Apellido: 'Gómez', Dni: '87654321', Telefono: '3496-654321', Email: 'maria@email.com', Direccion: 'Av. Belgrano 789' }
  ];

  const bicicletas: Bicicleta[] = [
    { id_bicicleta: 1, id_cliente: 1, Num_serie: 'SN-998822', marca: 'Vairo', modelo: 'XR 3.8', color: 'Negro', rodado: '29', talle: 'M', Precio: 450000 },
    { id_bicicleta: 2, id_cliente: 2, Num_serie: 'SN-112233', marca: 'Venzo', modelo: 'Amphion', color: 'Rojo', rodado: '29', talle: 'S', Precio: 520000 }
  ];

  // --- ESTADOS LOCALES SIMULADOS ---
  const [ventas, setVentas] = useState<Venta[]>([
    { id_venta: 1, id_cliente: 1, fecha: '2026-06-01', total: 15000, tipo_pago: 'Efectivo' }
  ]);

  const [reparaciones, setReparaciones] = useState<Reparacion[]>([
    { id_reparacion: 1, id_bicicleta: 1, descripcion_falla: 'Cambio de pastillas de freno y centrado de llanta', costo_estimado: 12000, estado: 'En reparación', fecha_ingreso: '2026-06-05' },
    { id_reparacion: 2, id_bicicleta: 2, descripcion_falla: 'Service general y lubricación de cadena', costo_estimado: 18000, estado: 'Recibida', fecha_ingreso: '2026-06-08' }
  ]);

  // Estado para el formulario de Nueva Reparación (CU13)
  const [nuevaReparacion, setNuevaReparacion] = useState<Reparacion>({
    id_bicicleta: 0,
    descripcion_falla: '',
    costo_estimado: 0,
    estado: 'Recibida', // Estado inicial por defecto
    fecha_ingreso: new Date().toISOString().split('T')[0]
  });

  // Funciones auxiliares para renderizar nombres en las tablas
  const obtenerNombreCliente = (id_cl: number) => {
    const c = clientes.find(item => item.id_cliente === id_cl);
    return c ? `${c.Apellido}, ${c.Nombre}` : 'Consumidor Final';
  };

  const obtenerDatosBici = (id_bc: number) => {
    const b = bicicletas.find(item => item.id_bicicleta === id_bc);
    return b ? `${b.marca} ${b.modelo} (${b.Num_serie})` : 'Desconocida';
  };

  // Manejador para registrar la reparación (CU13)
  const handleCrearReparacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaReparacion.id_bicicleta === 0 || !nuevaReparacion.descripcion_falla) {
      alert('Por favor selecciona una bicicleta e ingresa el detalle de la falla.');
      return;
    }

    setReparaciones([
      ...reparaciones,
      { ...nuevaReparacion, id_reparacion: reparaciones.length + 1 }
    ]);

    // Resetear formulario
    setNuevaReparacion({
      id_bicicleta: 0,
      descripcion_falla: '',
      costo_estimado: 0,
      estado: 'Recibida',
      fecha_ingreso: new Date().toISOString().split('T')[0]
    });
  };

  // Función para cambiar dinámicamente el estado de una reparación (RF15)
  const handleCambiarEstado = (id_rep: number, nuevoEstado: Reparacion['estado']) => {
    setReparaciones(reparaciones.map(rep => 
      rep.id_reparacion === id_rep ? { ...rep, estado: nuevoEstado } : rep
    ));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* ================= SECCIÓN REGISTRO DE VENTAS ================= */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: '#1e293b', marginBottom: '15px' }}>Historial de Facturación / Ventas</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>ID Venta</th>
              <th style={{ padding: '10px' }}>Cliente</th>
              <th style={{ padding: '10px' }}>Fecha</th>
              <th style={{ padding: '10px' }}>Método de Pago</th>
              <th style={{ padding: '10px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map(v => (
              <tr key={v.id_venta} style={{ borderBottom: '1px solid #edf2f7' }}>
                <td style={{ padding: '10px' }}>#{v.id_venta}</td>
                <td style={{ padding: '10px' }}>{obtenerNombreCliente(v.id_cliente)}</td>
                <td style={{ padding: '10px' }}>{v.fecha}</td>
                <td style={{ padding: '10px' }}><span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>{v.tipo_pago}</span></td>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#16a34a' }}>${v.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= SECCIÓN TALLER / REPARACIONES ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        
        {/* Formulario Alta de Orden de Trabajo (CU13) */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>Nueva Orden de Taller</h3>
          <form onSubmit={handleCrearReparacion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>Seleccionar Bicicleta *</label>
              <select 
                value={nuevaReparacion.id_bicicleta}
                onChange={e => setNuevaReparacion({...nuevaReparacion, id_bicicleta: Number(e.target.value)})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value={0}>-- Seleccionar por Marca/Serie --</option>
                {bicicletas.map(b => (
                  <option key={b.id_bicicleta} value={b.id_bicicleta}>
                    {b.marca} {b.modelo} (Serie: {b.Num_serie})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>Descripción del Problema *</label>
              <textarea 
                rows={3}
                value={nuevaReparacion.descripcion_falla}
                onChange={e => setNuevaReparacion({...nuevaReparacion, descripcion_falla: e.target.value})}
                placeholder="Detalle los arreglos a realizar..."
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>Presupuesto Estimado ($)</label>
              <input 
                type="number"
                value={nuevaReparacion.costo_estimado}
                onChange={e => setNuevaReparacion({...nuevaReparacion, costo_estimado: Number(e.target.value)})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>

            <button type="submit" style={{ padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
              Ingresar al Taller
            </button>
          </form>
        </div>

        {/* Tabla de Monitoreo del Taller (RF15) */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>Monitoreo de Reparaciones Activas</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Bicicleta</th>
                <th style={{ padding: '10px' }}>Falla / Tarea</th>
                <th style={{ padding: '10px' }}>Costo</th>
                <th style={{ padding: '10px' }}>Estado Actual (RF15)</th>
              </tr>
            </thead>
            <tbody>
              {reparaciones.map(rep => (
                <tr key={rep.id_reparacion} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '10px', fontSize: '0.9rem' }}>{obtenerDatosBici(rep.id_bicicleta)}</td>
                  <td style={{ padding: '10px', fontSize: '0.9rem', color: '#4b5563' }}>{rep.descripcion_falla}</td>
                  <td style={{ padding: '10px', fontWeight: '500' }}>${rep.costo_estimado}</td>
                  <td style={{ padding: '10px' }}>
                    {/* DROPDOWN ESTRICTO EXIGIDO POR EL REQUERIMIENTO */}
                    <select
                      value={rep.estado}
                      onChange={e => handleCambiarEstado(rep.id_reparacion!, e.target.value as Reparacion['estado'])}
                      style={{
                        padding: '5px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontWeight: '500',
                        backgroundColor: 
                          rep.estado === 'Recibida' ? '#f3f4f6' :
                          rep.estado === 'En reparación' ? '#fef3c7' :
                          rep.estado === 'Lista' ? '#d1fae5' : '#e0f2fe',
                        color: 
                          rep.estado === 'Recibida' ? '#374151' :
                          rep.estado === 'En reparación' ? '#d97706' :
                          rep.estado === 'Lista' ? '#059669' : '#0284c7'
                      }}
                    >
                      <option value="Recibida">Recibida</option>
                      <option value="En reparación">En reparación</option>
                      <option value="Lista">Lista</option>
                      <option value="Entregada">Entregada</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}