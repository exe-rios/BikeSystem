import { useState } from 'react'
import './App.css'
import { ClientesView } from './views/ClientesView';
// Nota: Puedes mantener las importaciones de imágenes aquí arriba si las usas más adelante, 
// por ahora las dejamos comentadas o guardadas en la carpeta assets.

function App() {
  // Este estado simulará en qué pantalla estamos parados (basado en tus módulos)
  const [vistaActual, setVistaActual] = useState<'inicio' | 'clientes' | 'bicicletas' | 'ventas'>('inicio')

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f5f5f5', color: '#333' }}>
      
      {/* --- MENU LATERAL (SIDEBAR) PROVISIONAL --- */}
      <aside style={{ width: '250px', backgroundColor: '#1e293b', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
          Ventas y Stock
        </button>
      </aside>

      {/* --- CONTENIDO PRINCIPAL DINÁMICO --- */}
      <main style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        {vistaActual === 'inicio' && (
          <div>
            <h1>Panel de Control Principal</h1>
            <p>Bienvenido al Sistema de Gestión de Bicicletas. Selecciona un módulo en el menú de la izquierda para comenzar.</p>
          </div>
        )}

        {vistaActual === 'clientes' && (
          <div>
            <h1>Módulo de Clientes</h1>
            <p>Aquí se listarán los clientes y se ejecutarán los Casos de Uso (Registrar, Modificar, Buscar).</p>
            <ClientesView />
          </div>
        )}

        {vistaActual === 'bicicletas' && (
          <div>
            <h1>Módulo de Bicicletas</h1>
            <p>Aquí gestionaremos el parque de bicicletas asociadas a los clientes.</p>
            {/* Próximamente pondremos aquí tu componente de Bicicletas */}
          </div>
        )}

        {vistaActual === 'ventas' && (
          <div>
            <h1>Módulo de Ventas y Repuestos</h1>
            <p>Control de facturación, reparaciones y stock de productos.</p>
          </div>
        )}
      </main>

    </div>
  )
}

export default App