import { useState } from 'react';
import iconCarrito from '../assets/Fotinhos/carrito.png';
import iconReparar from '../assets/Fotinhos/reparar.png';
import iconAlerta from '../assets/Fotinhos/alerta.png';
import iconGrafico from '../assets/Fotinhos/grafico-de-barras.png';

interface InicioViewProps {
  onNavigate: (view: string) => void;
}

export function InicioView({ onNavigate }: InicioViewProps) {
  // TODO: Cargar alertas de stock desde backend GET /api/productos?alertas=true
  const [stockAlerts] = useState<Array<{ id: number; producto: string; stock: number; minimo: number }>>([]);

  // TODO: Cargar últimos movimientos desde backend GET /api/movimientos o /api/dashboard/ultimos-movimientos
  const [ultimosMovimientos] = useState<Array<{ id: number; tipo: string; cliente: string; detalle: string; estado: string; fecha: string }>>([]);

  // TODO: Cargar estadísticas del día desde backend GET /api/dashboard/estadisticas-hoy
  const [estadisticas] = useState({
    ventasHoy: 0,
    reparacionesActivas: 0,
    ingresosHoy: 0,
    entregasHoy: 0
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#fff', padding: '4px' }}>
      
      {/* HEADER SIMPLE */}
      <div>
        <h1 style={{color: '#333', fontSize: '2rem', fontWeight: '700', margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#888', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Visión general del negocio</p>
      </div>

      {/* ACCIONES RÁPIDAS */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 12px 0', color: '#aaa' }}>Acciones Rápidas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <button 
            onClick={() => onNavigate('ventas')}
            style={{
              height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              backgroundColor: '#3cf288', color: '#fff', border: 'none', borderRadius: '6px',
              fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer'
            }}
          >
            <img src={iconCarrito} alt="Nueva Venta" style={{ width: '24px', height: '24px' }} />
            Nueva Venta
          </button>
          <button 
            onClick={() => onNavigate('reparaciones')}
            style={{
              height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              backgroundColor: '#fff', color: '#333', border: '1px solid #333', borderRadius: '6px',
              fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer'
            }}
          >
            <img src={iconReparar} alt="Nueva Reparación" style={{ width: '24px', height: '24px' }} />
            Nueva Reparación
          </button>
        </div>
      </div>

      {/* BLOQUES CENTRALES: ESTILO TARJETA OSCURA CON BORDE (MODIFICABLE) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* PANEL: ALERTAS DE STOCK */}
        <div style={{ 
          backgroundColor: '#fff', // <-- CAMBIA EL FONDO DE ALERTAS ACÁ (ej: 'var(--bg-tarjeta)' o '#111')
          borderRadius: '8px', 
          border: '1px solid #ccc', // <-- CAMBIA EL BORDE ACÁ
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between' 
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 14px 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={iconAlerta} alt="Alertas de Stock" style={{ width: '20px', height: '20px' }} />
              Alertas de Stock
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stockAlerts.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>{item.producto}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#888' }}>Stock: {item.stock} / Mínimo: {item.minimo}</p>
                    </div>
                    <span style={{ padding: '2px 8px', backgroundColor: '#e74c3c', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>BAJO</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => onNavigate('stock')}
            style={{ width: '100%', marginTop: '16px', padding: '10px', backgroundColor: 'transparent', color: '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Ver inventario completo →
          </button>
        </div>

        {/* PANEL: ESTADÍSTICAS RÁPIDAS */}
        <div style={{ 
          backgroundColor: '#fff', // <-- CAMBIA EL FONDO DE ESTADÍSTICAS ACÁ
          borderRadius: '8px', 
          border: '1px solid #ccc', // <-- CAMBIA EL BORDE ACÁ
          padding: '20px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <img src={iconGrafico} alt="Estadísticas del Día" style={{ width: '24px', height: '24px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: '#aaa' }}>Estadísticas del Día</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ccc' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#777' }}>Ventas Hoy</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.6rem', fontWeight: '700', color: '#3498db' }}>{estadisticas.ventasHoy}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ccc' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#777' }}>Reparaciones Activas</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.6rem', fontWeight: '700', color: '#e67e22' }}>{estadisticas.reparacionesActivas}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ccc' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#777' }}>Ingresos Hoy</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.6rem', fontWeight: '700', color: '#2ecc71' }}>${estadisticas.ingresosHoy.toLocaleString()}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ccc' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#777' }}>Entregas Hoy</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.6rem', fontWeight: '700', color: '#333' }}>{estadisticas.entregasHoy}</p>
            </div>
          </div>
        </div>

      </div>

      {/* RECUADRO INFERIOR: TABLA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: '#aaa' }}>Últimos Movimientos</h3>
        <div style={{ backgroundColor: '#fff', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#000' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', backgroundColor: '#fafafa' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>Tipo</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>Cliente</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>Detalle</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>Estado</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#666', fontWeight: 'bold', textAlign: 'right' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ultimosMovimientos.map((mov) => (
                <tr key={mov.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                      backgroundColor: mov.tipo === 'Venta' ? '#e3f2fd' : '#fff3e0',
                      color: mov.tipo === 'Venta' ? '#1e88e5' : '#f57c00'
                    }}>
                      {mov.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: '500' }}>{mov.cliente}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#444' }}>{mov.detalle}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: '600', color: mov.estado === 'Completada' ? '#27ae60' : '#e67e22' }}>
                    ● {mov.estado}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#777', textAlign: 'right' }}>{mov.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}