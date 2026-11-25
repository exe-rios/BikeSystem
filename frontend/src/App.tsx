import { useState, useEffect, lazy, Suspense } from 'react';
import { PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
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
import { LoginView } from './views/Login/LoginView';
import { AuthProvider, useAuth, type AuthUser } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getUserRoleTheme } from './utils/userColors';

const ClientesView = lazy(() => import('./views/Clientes/ClientesView').then(m => ({ default: m.ClientesView })));
const BicicletasView = lazy(() => import('./views/Bicicletas/BicicletasView').then(m => ({ default: m.BicicletasView })));
const VentasView = lazy(() => import('./views/Ventas/VentasView').then(m => ({ default: m.VentasView })));
const ReparacionesView = lazy(() => import('./views/Reparaciones/ReparacionesView').then(m => ({ default: m.ReparacionesView })));
const StockView = lazy(() => import('./views/Stock/StockView').then(m => ({ default: m.StockView })));
const ReportesView = lazy(() => import('./views/Reportes/ReportesView').then(m => ({ default: m.ReportesView })));
const PagoProveedores = lazy(() => import('./views/PagoProveedores/PagoProveedoresView').then(m => ({ default: m.PagoProveedores })));
const UsuariosView = lazy(() => import('./views/Usuarios/UsuariosView').then(m => ({ default: m.UsuariosView })));
const AuditoriaView = lazy(() => import('./views/Auditoria/AuditoriaView').then(m => ({ default: m.AuditoriaView })));

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

/** Contenedor maestro de la interfaz: muestra el Login o el panel autenticado reiniciado por sesión. */
function AppContent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return <LoginView onLoginSuccess={(token, usuario) => login(token, usuario)} />;
  }

  return <AuthenticatedLayout key={user.id_usuario} user={user} logout={logout} />;
}

const SIDEBAR_STORAGE_KEY = 'bikesystem_sidebar_colapsado';

/** Layout principal autenticado con barra lateral colapsable de navegación y vistas activas. */
function AuthenticatedLayout({ user, logout }: { user: AuthUser; logout: () => void }) {
  const [vistaActual, setVistaActual] = useState<VistaTipo>('inicio');
  const [sidebarColapsado, setSidebarColapsado] = useState<boolean>(() => {
    try {
      const guardado = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (guardado !== null) return guardado === 'true';
    } catch {
      // Ignorar fallos de localStorage
    }
    return typeof window !== 'undefined' ? window.innerWidth <= 1440 : false;
  });

  useEffect(() => {
    const onResize = () => {
      try {
        if (localStorage.getItem(SIDEBAR_STORAGE_KEY) !== null) return;
      } catch {
        // Ignorar
      }
      setSidebarColapsado(window.innerWidth <= 1440);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarColapsado(prev => {
      const siguiente = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(siguiente));
      } catch {
        // Ignorar
      }
      return siguiente;
    });
  };

  const userName = user?.nombre_usuario || 'Usuario';
  const userRole = (user?.rol || 'EMPLEADO').toUpperCase();
  const roleTheme = getUserRoleTheme(userRole, userName);
  const esAdmin = userRole === 'ADMIN' || roleTheme.isSuperAdmin;

  // Configuración de menús con restricción por rol (orden personalizado)
  const menuItems: Array<{ id: VistaTipo; label: string; icon: string; adminOnly?: boolean }> = [
    { id: 'inicio', label: 'Inicio', icon: iconInicio },
    { id: 'clientes', label: 'Clientes', icon: iconClientes },
    { id: 'bicicletas', label: 'Bicicletas Clientes', icon: iconBicicletas },
    { id: 'ventas', label: 'Ventas', icon: iconVentas },
    { id: 'reparaciones', label: 'Reparaciones', icon: iconReparaciones },
    { id: 'stock', label: 'Stock', icon: iconStock },
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
        width: sidebarColapsado ? '72px' : '260px',
        minWidth: sidebarColapsado ? '72px' : '260px',
        backgroundColor: 'var(--bg-tarjeta)',
        borderRight: '1px solid var(--borde-input)',
        padding: sidebarColapsado ? '18px 10px' : '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.18s ease, min-width 0.18s ease, padding 0.18s ease'
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Título de Marca + botón colapsar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarColapsado ? 'center' : 'space-between',
            flexDirection: sidebarColapsado ? 'column' : 'row',
            gap: sidebarColapsado ? '10px' : '8px',
            marginBottom: '22px',
            paddingLeft: sidebarColapsado ? '0' : '8px'
          }}>
            <h2
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '1.3rem',
                fontWeight: '700',
                color: 'var(--texto-principal)',
                margin: 0
              }}
              title="DN Bike"
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
              {!sidebarColapsado && 'DN Bike'}
            </h2>

            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarColapsado ? 'Expandir menú lateral' : 'Contraer menú lateral'}
              aria-label={sidebarColapsado ? 'Expandir menú lateral' : 'Contraer menú lateral'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'transparent',
                color: 'var(--texto-mutado)',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {sidebarColapsado ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {/* Opciones de Navegación */}
          {menuItems.map((item) => {
            if (item.adminOnly && !esAdmin) return null;
            const activo = vistaActual === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setVistaActual(item.id)}
                title={sidebarColapsado ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarColapsado ? 'center' : 'flex-start',
                  gap: sidebarColapsado ? '0' : '12px',
                  width: '100%',
                  padding: sidebarColapsado ? '10px 8px' : '10px 14px',
                  fontSize: '0.9rem',
                  fontWeight: activo ? '700' : '500',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  backgroundColor: activo ? 'var(--azul-oscuro)' : 'transparent',
                  color: activo ? '#ffffff' : 'var(--texto-mutado)',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ display: 'inline-flex', width: '20px', height: '20px', alignItems: 'center', justifyContent: 'center', opacity: activo ? 1 : 0.75, fontSize: '1rem', flexShrink: 0 }}>
                  <img
                    src={item.icon}
                    alt={`${item.label} icon`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: activo ? 'brightness(0) invert(1)' : 'none'
                    }}
                  />
                </span>
                {!sidebarColapsado && item.label}
              </button>
            );
          })}
        </div>

        {/* --- APARTADO DE USUARIO LOGUEADO --- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: sidebarColapsado ? 'center' : 'stretch',
          gap: '14px',
          paddingTop: '18px',
          marginTop: '16px',
          borderTop: '1px solid var(--borde-input)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Fila superior: Info del Perfil con color distintivo por rol */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarColapsado ? 'center' : 'flex-start', gap: '12px' }}>
            <div
              title={sidebarColapsado ? `${userName} (${roleTheme.isSuperAdmin ? 'SUPERADMIN' : roleTheme.label})` : undefined}
              style={{
                width: '42px',
                height: '42px',
                minWidth: '42px',
                borderRadius: '50%',
                backgroundColor: roleTheme.avatarBg,
                color: roleTheme.avatarText,
                border: `2px solid ${roleTheme.avatarBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '1rem',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}
            >
              {roleTheme.isSuperAdmin ? '👑' : (userName ? userName.slice(0, 2).toUpperCase() : 'U')}
            </div>

            {!sidebarColapsado && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--texto-principal)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {userName}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '1px 8px',
                    borderRadius: '12px',
                    backgroundColor: roleTheme.badgeBg,
                    color: roleTheme.badgeColor,
                    border: `1px solid ${roleTheme.badgeBorder}`,
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}>
                    {roleTheme.isSuperAdmin ? 'SUPERADMIN' : roleTheme.label}
                  </span>
                  {roleTheme.isSuperAdmin && (
                    <span style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: '600' }} title="Perfil exclusivo de desarrollador">
                      (Dev)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fila inferior: Botón Cerrar Sesión */}
          <button
            onClick={logout}
            title={sidebarColapsado ? 'Cerrar Sesión' : undefined}
            style={{
              width: '100%',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              color: '#333',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: 'pointer',
              padding: sidebarColapsado ? '9px 0' : '9px',
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
            {sidebarColapsado ? <LogOut size={16} /> : 'Cerrar Sesión'}
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO DINÁMICO DE LAS VISTAS --- */}
      <main
        className="app-main-content"
        style={{
          flex: 1,
          minWidth: 0,
          padding: '36px',
          overflowY: 'auto'
        }}
      >
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
            Cargando módulo...
          </div>
        }>
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
        </Suspense>
      </main>

    </div>
  );
}

/** Componente raíz de la aplicación con límites de error y contexto de autenticación. */
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}