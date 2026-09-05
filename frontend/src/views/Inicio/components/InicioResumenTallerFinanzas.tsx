import iconGrafico from '../../../assets/Fotinhos/grafico-de-barras.png';
import iconReparar from '../../../assets/Fotinhos/reparar.png';
import type { DashboardData } from '../types';

interface InicioResumenTallerFinanzasProps {
  esAdmin: boolean;
  dashboard: DashboardData | null;
  totalReparacionesActivas: number;
}

export function InicioResumenTallerFinanzas({
  esAdmin,
  dashboard,
  totalReparacionesActivas
}: InicioResumenTallerFinanzasProps) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-tarjeta)',
      borderRadius: '14px',
      border: '1px solid var(--borde-input)',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
    }}>
      {esAdmin ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src={iconGrafico} alt="Estadísticas del Mes" style={{ width: '24px', height: '24px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>Resumen Financiero del Mes</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Ventas Mostrador</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#2563eb' }}>
                ${Number(dashboard?.finanzas?.ventas_mostrador || 0).toLocaleString()}
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Ingresos Taller</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#ea580c' }}>
                ${Number(dashboard?.finanzas?.ingresos_taller || 0).toLocaleString()}
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Total Recaudado Mes</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#16a34a' }}>
                ${Number(dashboard?.finanzas?.total_mes || 0).toLocaleString()}
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Reparaciones Activas</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                {totalReparacionesActivas} orden{totalReparacionesActivas === 1 ? '' : 'es'}
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src={iconReparar} alt="Carga de Taller" style={{ width: '24px', height: '24px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>Carga de Trabajo del Taller</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309', fontWeight: '600' }}>Órdenes Recibidas</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#b45309' }}>
                {dashboard?.taller_activo?.find(t => t.estado.toLowerCase().includes('recibida'))?.cantidad || 0}
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'rgba(234, 88, 12, 0.08)', borderRadius: '10px', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#c2410c', fontWeight: '600' }}>En Reparación</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#c2410c' }}>
                {dashboard?.taller_activo?.find(t => t.estado.toLowerCase().includes('reparación') || t.estado.toLowerCase().includes('reparacion'))?.cantidad || 0}
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'rgba(13, 148, 136, 0.08)', borderRadius: '10px', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#0f766e', fontWeight: '600' }}>Listas para Entrega</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#0f766e' }}>
                {dashboard?.taller_activo?.find(t => t.estado.toLowerCase().includes('lista'))?.cantidad || 0}
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Total en Proceso</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                {totalReparacionesActivas}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
