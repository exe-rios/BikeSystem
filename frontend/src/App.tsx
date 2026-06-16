import { useState } from 'react'
import './App.css'
import { InicioView } from './views/InicioView'; // Conectado perfectamente
import { ClientesView } from './views/ClientesView';
import { BicicletasView } from './views/BicicletasView';
import { VentasView } from './views/VentasView';
import { ReparacionesView } from './views/ReparacionesView';
import { StockView } from './views/StockView';
import { ReportesView } from './views/ReportesView';
import { PagoProveedores } from './views/PagoProveedores';

function App() {
  const [vistaActual, setVistaActual] = useState<'inicio' | 'clientes' | 'bicicletas' | 'ventas' | 'reparaciones' | 'stock' | 'reportes' | 'pago-proveedores'>('inicio') // Lo puse en 'inicio' por defecto para que lo pruebes directo

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw', 
      maxWidth: '100%', 
      maxHeight: '100vh', 
      overflow: 'hidden', 
      backgroundColor: 'var(--bg-principal)',
      color: 'var(--texto-principal)' 
    }}>

      {/* --- SIDEBAR MENÚ LATERAL --- */}
      <aside style={{ 
        width: '260px', 
        minWidth: '260px', 
        backgroundColor: 'var(--bg-tarjeta)', 
        borderRight: '1px solid var(--borde-input)',
        padding: '30px 20px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Título de Marca */}
          <h2 style={{ 
            fontSize: '1.35rem', 
            fontWeight: '700',
            color: 'var(--texto-principal)', 
            marginBottom: '35px', 
            paddingLeft: '10px'
          }}>
            Bike System
          </h2>

          {/* Opciones de Navegación */}
          {[
            { id: 'inicio', label: 'Inicio', icon: '' },
            { id: 'clientes', label: 'Clientes', icon: '' },
            { id: 'bicicletas', label: 'Bicicletas', icon: '' },
            { id: 'ventas', label: 'Ventas', icon: '' },
            { id: 'reparaciones', label: 'Reparaciones', icon: '' },
            { id: 'stock', label: 'Stock', icon: '' },
            { id: 'reportes', label: 'Reportes', icon: '' },
            { id: 'pago-proveedores', label: 'Pago a Proveedores', icon: '' }
          ].map((item) => {
            const activo = vistaActual === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setVistaActual(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '0.95rem',
                  fontWeight: activo ? '600' : '500',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  backgroundColor: activo ? 'var(--azul-oscuro)' : 'transparent',
                  color: activo ? '#ffffff' : 'var(--texto-mutado)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '1.1rem', opacity: activo ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Perfil del Usuario */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          paddingTop: '20px', 
          borderTop: '1px solid var(--borde-input)' 
        }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--azul-oscuro)', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}>
            AU
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Admin User</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)' }}>admin@bikesystem.com</span>
          </div>
        </div>
      </aside>

      {/* --- CONTENIDO DINÁMICO DE LAS VISTAS --- */}
      <main style={{ 
        flex: 1, 
        width: 'calc(100vw - 260px)', 
        padding: '40px', 
        overflowY: 'auto'
      }}>
        {/* Cambiado el div plano por tu nuevo componente modular */}
        {vistaActual === 'inicio' && <InicioView onNavigate={setVistaActual as any} />}

        {vistaActual === 'clientes' && <ClientesView />}
        {vistaActual === 'bicicletas' && <BicicletasView />}
        {vistaActual === 'ventas' && <VentasView />}
        {vistaActual === 'reparaciones' && <ReparacionesView />}
        {vistaActual === 'stock' && <StockView />}
        {vistaActual === 'reportes' && <ReportesView />}
        {vistaActual === 'pago-proveedores' && <PagoProveedores />}
      </main>

    </div>
  )
}

export default App