import type { InicioViewProps } from './types';
import { useInicio } from './hooks/useInicio';
import { InicioHeader } from './components/InicioHeader';
import { InicioAccionesRapidas } from './components/InicioAccionesRapidas';
import { InicioAlertasStock } from './components/InicioAlertasStock';
import { InicioResumenTallerFinanzas } from './components/InicioResumenTallerFinanzas';
import { InicioUltimosMovimientos } from './components/InicioUltimosMovimientos';

export function InicioView({ onNavigate }: InicioViewProps) {
  const {
    esAdmin,
    dashboard,
    ultimasVentas,
    ultimasReparaciones,
    totalReparacionesActivas,
    cargando,
    error
  } = useInicio();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--texto-principal)', padding: '4px' }}>
      {/* HEADER Y BIENVENIDA */}
      <InicioHeader esAdmin={esAdmin} error={error} />

      {/* ACCIONES RÁPIDAS */}
      <InicioAccionesRapidas onNavigate={onNavigate} />

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
