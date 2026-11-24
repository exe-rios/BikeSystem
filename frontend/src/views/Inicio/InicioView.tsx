import type { InicioViewProps } from './types';
import { useInicio } from './hooks/useInicio';
import { InicioHeader } from './components/InicioHeader';
import { InicioAccionesRapidas } from './components/InicioAccionesRapidas';
import { InicioAlertasStock } from './components/InicioAlertasStock';
import { InicioResumenTallerFinanzas } from './components/InicioResumenTallerFinanzas';
import { InicioUltimosMovimientos } from './components/InicioUltimosMovimientos';
import { InicioPagosPendientes } from './components/InicioPagosPendientes';

/** Tablero principal con accesos directos, alertas de stock, pagos agendados y resumen operativo. */
export function InicioView({ onNavigate }: InicioViewProps) {
  const {
    esAdmin,
    dashboard,
    ultimasVentas,
    ultimasReparaciones,
    pagosPendientes,
    metodosPago,
    totalReparacionesActivas,
    cargando,
    error,
    recargar
  } = useInicio();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--texto-principal)', padding: '4px' }}>
      {/* HEADER Y BIENVENIDA */}
      <InicioHeader esAdmin={esAdmin} error={error} onRecargar={recargar} cargando={cargando} />

      {/* ACCIONES RÁPIDAS */}
      <InicioAccionesRapidas onNavigate={onNavigate} />

      {/* RECORDATORIOS DE PRÓXIMOS PAGOS A PROVEEDORES (ADMIN/SUPERADMIN) */}
      <InicioPagosPendientes
        esAdmin={esAdmin}
        cargando={cargando}
        pendientes={pagosPendientes}
        metodosPago={metodosPago}
        onPagoRegistrado={recargar}
        onNavigate={onNavigate}
      />

      {/* BLOQUES CENTRALES: ALERTAS DE STOCK Y RESUMEN FINANCIERO / TALLER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <InicioAlertasStock
          cargando={cargando}
          dashboard={dashboard}
          onNavigate={onNavigate}
        />
        <InicioResumenTallerFinanzas
          esAdmin={esAdmin}
          dashboard={dashboard}
          totalReparacionesActivas={totalReparacionesActivas}
        />
      </div>

      {/* MOVIMIENTOS RECIENTES: VENTAS Y TALLER */}
      <InicioUltimosMovimientos
        ultimasVentas={ultimasVentas}
        ultimasReparaciones={ultimasReparaciones}
      />
    </div>
  );
}
