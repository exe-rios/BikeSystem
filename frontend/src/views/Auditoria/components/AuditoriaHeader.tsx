interface AuditoriaHeaderProps {
  cargando: boolean;
  onActualizar: () => void;
  onDescargarBackup: () => void;
  error: string | null;
}

/** Encabezado del módulo de auditoría con botones de actualización y respaldo de base de datos. */
export function AuditoriaHeader({
  cargando,
  onActualizar,
  onDescargarBackup,
  error
}: AuditoriaHeaderProps) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>
            Auditoría
          </h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '4px' }}>
            Registro cronológico inmutable de operaciones del sistema
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onDescargarBackup}
            disabled={cargando}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: cargando ? 'not-allowed' : 'pointer',
              opacity: cargando ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
            }}
          >
            Descargar Respaldo SQL
          </button>

          <button
            type="button"
            onClick={onActualizar}
            disabled={cargando}
            style={{
              backgroundColor: 'var(--azul-oscuro)',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: cargando ? 'not-allowed' : 'pointer',
              opacity: cargando ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid #ef4444',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}
    </>
  );
}
