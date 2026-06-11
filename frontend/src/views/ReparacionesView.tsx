import { useState } from 'react';
import type { Reparacion } from '../types';

export function ReparacionesView() {
  // TODO: Cargar reparaciones desde backend GET /api/talleres
  const [reparaciones] = useState<Reparacion[]>([]);

  // Configuración de las 4 columnas requeridas (Título, propiedad estado y color de cabecera)
  const columnas = [
    { titulo: 'Recibida', estado: 'Recibida', colorBg: '#f59e0b' },
    { titulo: 'En Reparación', estado: 'En Reparación', colorBg: '#ea580c' },
    { titulo: 'Lista', estado: 'Lista', colorBg: '#0d9488' },
    { titulo: 'Entregada', estado: 'Entregada', colorBg: '#64748b' } // Gris neutro para las finalizadas
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px' }}>
      
      {/* Encabezado de la Sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Gestión de Reparaciones</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Administre el taller y seguimiento de reparaciones</p>
        </div>
        
        <button style={{
          backgroundColor: '#0f172a', color: '#fff', border: 'none',
          padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
        }}>
          ➕ Registrar Nueva Reparación
        </button>
      </div>

      {/* Contenedor del Tablero (Grid de 4 columnas) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, minmax(250px, 1fr))', 
        gap: '16px', 
        alignItems: 'start',
        overflowX: 'auto' 
      }}>
        {columnas.map(col => {
          // Filtramos las reparaciones que pertenecen a esta columna específica
          const reparacionesFiltradas = reparaciones.filter(r => r.estado === col.estado);

          return (
            <div key={col.titulo} style={{ 
              backgroundColor: '#f8fafc', 
              borderRadius: '14px', 
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingBottom: '16px'
            }}>
              
              {/* Cabecera de la Columna */}
              <div style={{ 
                backgroundColor: col.colorBg, 
                color: '#fff', 
                padding: '14px 16px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>{col.titulo}</span>
                <span style={{ 
                  backgroundColor: 'rgba(255,255,255,0.25)', 
                  padding: '2px 8px', 
                  borderRadius: '20px', 
                  fontSize: '0.85rem', 
                  fontWeight: '700' 
                }}>
                  {reparacionesFiltradas.length}
                </span>
              </div>

              {/* Listado de Tarjetas dentro de la columna */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 12px' }}>
                {reparacionesFiltradas.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                    No hay reparaciones
                  </p>
                ) : (
                  reparacionesFiltradas.map(rep => (
                    <div key={rep.id_reparacion} style={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      padding: '16px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                        Cliente #{rep.id_bicicleta}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', fontWeight: '500' }}>
                        Bicicleta #{rep.id_bicicleta}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                        Ingreso: {rep.fecha_ingreso}
                      </p>
                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}