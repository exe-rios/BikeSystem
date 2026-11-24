interface InicioHeaderProps {
  esAdmin: boolean;
  error: string | null;
  onRecargar?: () => void;
  cargando?: boolean;
}

/** Cabecera del panel de control con bienvenida diferenciada por rol. */
export function InicioHeader({ esAdmin, error, onRecargar, cargando }: InicioHeaderProps) {
  return (
    <>
      <div>
        <h1 style={{ color: 'var(--texto-principal)', fontSize: '2rem', fontWeight: '700', margin: 0 }}>Ventana principal</h1>
        <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
          {esAdmin ? 'Visión general y métricas del negocio en tiempo real' : 'Panel de operaciones diarias de ventas y taller'}
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <span>{error}</span>
          {onRecargar && (
            <button
              type="button"
              onClick={onRecargar}
              disabled={cargando}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: cargando ? 'not-allowed' : 'pointer',
                opacity: cargando ? 0.6 : 1,
                flexShrink: 0
              }}
            >
              {cargando ? 'Cargando...' : 'Reintentar'}
            </button>
          )}
        </div>
      )}
    </>
  );
}
