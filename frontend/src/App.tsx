import { useState } from 'react'
import './App.css'
import iconInicio from './assets/Fotinhos/icono-inicio.png'
import iconClientes from './assets/Fotinhos/icono-clientes.png'
import iconBicicletas from './assets/Fotinhos/icono-bicicletas.png'
import iconVentas from './assets/Fotinhos/icono-ventas.png'
import iconReparaciones from './assets/Fotinhos/icono-reparaciones.png'
import iconStock from './assets/Fotinhos/icono-stock.png'
import iconReportes from './assets/Fotinhos/icono-reportes.png'
import iconPagoProveedores from './assets/Fotinhos/icono-pagoproveedores.png'
import logoDnBike from './assets/Fotinhos/iconoDnBike.jpeg' // Mantengo el logo nuevo de tu compañero
import { InicioView } from './views/InicioView';
import { ClientesView } from './views/ClientesView';
import { BicicletasView } from './views/BicicletasView';
import { VentasView } from './views/VentasView';
import { ReparacionesView } from './views/ReparacionesView';
import { StockView } from './views/StockView';
import { ReportesView } from './views/ReportesView';
import { PagoProveedores } from './views/PagoProveedores';

// Importamos la vista de Login
import { LoginView } from './views/LoginView';

function App() {
  // Estados de autenticación (Cargan directo desde el localStorage si existen)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('userEmail'));
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('userName'));

  const [vistaActual, setVistaActual] = useState<'inicio' | 'clientes' | 'bicicletas' | 'ventas' | 'reparaciones' | 'stock' | 'reportes' | 'pago-proveedores'>('inicio')

  // Manejador del Login Exitoso
  const handleLoginSuccess = (tokenRecibido: string, emailRecibido: string, nombreRecibido: string) => {
    localStorage.setItem('token', tokenRecibido);
    localStorage.setItem('userEmail', emailRecibido);
    localStorage.setItem('userName', nombreRecibido);

    setToken(tokenRecibido);
    setUserEmail(emailRecibido);
    setUserName(nombreRecibido);
    setVistaActual('inicio');
  };

  // Manejador del Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');

    setToken(null);
    setUserEmail(null);
    setUserName(null);
  };

  // INTERCEPCIÓN: Si no hay token guardado, mostramos únicamente la pantalla de login
  if (!token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

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
          {/* Título de Marca (Cambio de tu compañero respetado) */}
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '1.35rem',
              fontWeight: '700',
              color: 'var(--texto-principal)',
              marginBottom: '35px',
              paddingLeft: '10px'
            }}
          >
            <img
              src={logoDnBike}
              alt="Logo DN Bike"
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                borderRadius: '50%'
              }}
            />
            DN Bike
          </h2>

          {/* Opciones de Navegación */}
          {[
            { id: 'inicio', label: 'Inicio', icon: iconInicio },
            { id: 'clientes', label: 'Clientes', icon: iconClientes },
            { id: 'bicicletas', label: 'Bicicletas', icon: iconBicicletas },
            { id: 'ventas', label: 'Ventas', icon: iconVentas },
            { id: 'reparaciones', label: 'Reparaciones', icon: iconReparaciones },
            { id: 'stock', label: 'Stock', icon: iconStock },
            { id: 'reportes', label: 'Reportes', icon: iconReportes },
            { id: 'pago-proveedores', label: 'Pago a Proveedores', icon: iconPagoProveedores }
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
                <span style={{ display: 'inline-flex', width: '22px', height: '22px', opacity: activo ? 1 : 0.7 }}>
                  <img src={item.icon} alt={`${item.label} icon`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>

        {/* --- APARTADO DE USUARIO AGRANDADO Y SIMÉTRICO (RESTAURADO Y ARREGLADO) --- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          paddingTop: '24px',
          borderTop: '1px solid var(--borde-input)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Fila superior: Info del Perfil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: 'var(--azul-oscuro)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '1.05rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              {userName ? userName.split(' ').map(n => n[0]).join('') : 'U'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                {userName || 'Usuario'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)', width: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail || 'correo@bikesystem.com'}
              </span>
            </div>
          </div>

          {/* Fila inferior: Botón Cerrar Sesión de ancho completo bien estilizado */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              color: '#333',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '11px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease-in-out',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e6e6e6';
              e.currentTarget.style.borderColor = '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = '#ccc';
            }}
          >
            <span></span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO DINÁMICO DE LAS VISTAS --- */}
      <main style={{
        flex: 1,
        width: 'calc(100vw - 260px)',
        padding: '40px',
        overflowY: 'auto'
      }}>
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