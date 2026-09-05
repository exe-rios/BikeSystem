import { useState } from 'react';
import iconInicio from './assets/Fotinhos/icono-inicio.png';
import iconClientes from './assets/Fotinhos/icono-clientes.png';
import iconBicicletas from './assets/Fotinhos/icono-bicicletas.png';
import iconVentas from './assets/Fotinhos/icono-ventas.png';
import iconReparaciones from './assets/Fotinhos/icono-reparaciones.png';
import iconStock from './assets/Fotinhos/icono-stock.png';
import iconReportes from './assets/Fotinhos/icono-reportes.png';
import iconPagoProveedores from './assets/Fotinhos/icono-pagoproveedores.png';
import logoDnBike from './assets/Fotinhos/iconoDnBike.jpeg';
import iconUsuarios from './assets/Fotinhos/icono-usuario.png';
import iconAuditoria from './assets/Fotinhos/icono-auditoria.png';

import { InicioView } from './views/Inicio/InicioView';
import { ClientesView } from './views/Clientes/ClientesView';
import { BicicletasView } from './views/Bicicletas/BicicletasView';
import { VentasView } from './views/Ventas/VentasView';
import { ReparacionesView } from './views/Reparaciones/ReparacionesView';
import { StockView } from './views/Stock/StockView';
import { ReportesView } from './views/Reportes/ReportesView';
import { PagoProveedores } from './views/PagoProveedores/PagoProveedoresView';
import { UsuariosView } from './views/Usuarios/UsuariosView';
import { AuditoriaView } from './views/Auditoria/AuditoriaView';
import { LoginView } from './views/Login/LoginView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

type VistaTipo =
  | 'inicio'
  | 'clientes'
  | 'bicicletas'
  | 'ventas'
  | 'reparaciones'
  | 'stock'
  | 'pago-proveedores'
  | 'reportes'
  | 'usuarios'
  | 'auditoria';

function AppContent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [vistaActual, setVistaActual] = useState<VistaTipo>('inicio');

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={(token, usuario) => login(token, usuario)} />;
  }

  const userName = user?.nombre_usuario || 'Usuario';
  const userRole = (user?.rol || 'EMPLEADO').toUpperCase();
  const esAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  // Configuración de menús con restricción por rol
  const menuItems: Array<{ id: VistaTipo; label: string; icon: string; adminOnly?: boolean }> = [
    { id: 'inicio', label: 'Inicio', icon: iconInicio },
    { id: 'ventas', label: 'Ventas', icon: iconVentas },
    { id: 'reparaciones', label: 'Reparaciones', icon: iconReparaciones },
    { id: 'stock', label: 'Stock', icon: iconStock },
    { id: 'bicicletas', label: 'Bicicletas Clientes', icon: iconBicicletas },
    { id: 'clientes', label: 'Clientes', icon: iconClientes },
    { id: 'pago-proveedores', label: 'Pagos a Proveedores', icon: iconPagoProveedores, adminOnly: true },
    { id: 'reportes', label: 'Reportes y Métricas', icon: iconReportes, adminOnly: true },
    { id: 'usuarios', label: 'Empleados / Usuarios', icon: iconUsuarios, adminOnly: true },
    { id: 'auditoria', label: 'Auditoría', icon: iconAuditoria, adminOnly: true },
  ];

  const handleNavigate = (view: string) => {
    setVistaActual(view as VistaTipo);
  };

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
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflowY: 'auto'
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Título de Marca */}
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '1.3rem',
              fontWeight: '700',
              color: 'var(--texto-principal)',
              marginBottom: '22px',
              paddingLeft: '8px'
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
          {menuItems.map((item) => {
            if (item.adminOnly && !esAdmin) return null;
            const activo = vistaActual === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setVistaActual(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  fontWeight: activo ? '700' : '500',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  backgroundColor: activo ? 'var(--azul-oscuro)' : 'transparent',
                  color: activo ? '#ffffff' : 'var(--texto-mutado)',
                  transition: 'all 0.15s ease',
                  textAlign: 'left'
                }}
              >
                <span style={{ display: 'inline-flex', width: '20px', height: '20px', alignItems: 'center', justifyContent: 'center', opacity: activo ? 1 : 0.75, fontSize: '1rem' }}>
                  <img src={item.icon} alt={`${item.label} icon`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>

        {/* --- APARTADO DE USUARIO LOGUEADO --- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          paddingTop: '18px',
          marginTop: '16px',
          borderTop: '1px solid var(--borde-input)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Fila superior: Info del Perfil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'var(--azul-oscuro)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              {userName ? userName.slice(0, 2).toUpperCase() : 'U'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--texto-principal)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {userName}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                Rol: {userRole}
              </span>
            </div>
          </div>

          {/* Fila inferior: Botón Cerrar Sesión */}
          <button
            onClick={logout}
            style={{
              width: '100%',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              color: '#333',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '9px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease-in-out',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.color = '#333';
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO DINÁMICO DE LAS VISTAS --- */}
      <main style={{
        flex: 1,
        width: 'calc(100vw - 260px)',
        padding: '36px',
        overflowY: 'auto'
      }}>
        {vistaActual === 'inicio' && <InicioView onNavigate={handleNavigate} />}
        {vistaActual === 'ventas' && <VentasView />}
        {vistaActual === 'reparaciones' && <ReparacionesView />}
        {vistaActual === 'stock' && <StockView />}
        {vistaActual === 'bicicletas' && <BicicletasView />}
        {vistaActual === 'clientes' && <ClientesView />}
        {vistaActual === 'pago-proveedores' && (esAdmin ? <PagoProveedores /> : <InicioView onNavigate={handleNavigate} />)}
        {vistaActual === 'reportes' && (esAdmin ? <ReportesView /> : <InicioView onNavigate={handleNavigate} />)}
        {vistaActual === 'usuarios' && (esAdmin ? <UsuariosView /> : <InicioView onNavigate={handleNavigate} />)}
        {vistaActual === 'auditoria' && (esAdmin ? <AuditoriaView /> : <InicioView onNavigate={handleNavigate} />)}
      </main>

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}