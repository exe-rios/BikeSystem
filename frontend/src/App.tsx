import { useState } from 'react'
import './App.css'
import { ClientesView } from './views/ClientesView';
import { BicicletasView } from './views/BicicletasView';
import { VentasView } from './views/VentasView';
import { StockView } from './views/StockView';

function App() {
  // Agregamos 'stock' como una pantalla independiente en el estado
  const [vistaActual, setVistaActual] = useState<'inicio' | 'clientes' | 'bicicletas' | 'ventas' | 'stock'>('inicio')

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw', 
      maxWidth: '100%', 
      maxHeight: '100vh', 
      overflow: 'hidden', 
      backgroundColor: '#f5f5f5', 
      color: '#333' 
    }}>

      {/* --- MENU LATERAL (SIDEBAR) --- */}
      <aside style={{ width: '250px', minWidth: '250px', backgroundColor: '#1e293b', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>BikeSystem</h2>

        <button onClick={() => setVistaActual('inicio')} style={{ textAlign: 'left', padding: '10px', background: vistaActual === 'inicio' ? '#334155' : 'none', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          Inicio
        </button>
        <button onClick={() => setVistaActual('clientes')} style={{ textAlign: 'left', padding: '10px', background: vistaActual === 'clientes' ? '#334155' : 'none', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          Gestión de Clientes
        </button>
        <button onClick={() => setVistaActual('bicicletas')} style={{ textAlign: 'left', padding: '10px', background: vistaActual === 'bicicletas' ? '#334155' : 'none', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          Gestión de Bicicletas
        </button>
        <button onClick={() => setVistaActual('ventas')} style={{ textAlign: 'left', padding: '10px', background: vistaActual === 'ventas' ? '#334155' : 'none', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          Ventas y Taller
        </button>
        {/* BOTÓN NUEVO SEPARADO */}
        <button onClick={() => setVistaActual('stock')} style={{ textAlign: 'left', padding: '10px', background: vistaActual === 'stock' ? '#334155' : 'none', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          Control de Stock
        </button>
      </aside>

      {/* --- CONTENIDO PRINCIPAL DINÁMICO --- */}
      <main style={{ 
        flex: 1, 
        width: 'calc(100vw - 250px)', 
        padding: '30px', 
        overflowY: 'auto', 
        overflowX: 'hidden' 
      }}>
        {vistaActual === 'inicio' && (
          <div>
            <h1>Panel de Control Principal</h1>
            <p>Bienvenido al Sistema de Gestión de Bicicletas. Selecciona un módulo en el menú de la izquierda para comenzar.</p>
          </div>
        )}

        {vistaActual === 'clientes' && (
          <ClientesView />
        )}

        {vistaActual === 'bicicletas' && (
          <BicicletasView />
        )}

        {/* CORRECCIÓN: El módulo de ventas ahora solo muestra Ventas y Reparaciones */}
        {vistaActual === 'ventas' && (
          <VentasView />
        )}

        {/* NUEVA CONDICIÓN: El stock se renderiza de forma independiente aquí */}
        {vistaActual === 'stock' && (
          <StockView />
        )}
      </main>

    </div>
  )
}

export default App