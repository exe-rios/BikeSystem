interface InicioHeaderProps {
  esAdmin: boolean;
  error: string | null;
}

export function InicioHeader({ esAdmin, error }: InicioHeaderProps) {
  return (
    <>
      <div>
        <h1 style={{ color: 'var(--texto-principal)', fontSize: '2rem', fontWeight: '700', margin: 0 }}>Ventana principal</h1>
        <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
          {esAdmin ? 'Visión general y métricas del negocio en tiempo real' : 'Panel de operaciones diarias de ventas y taller'}
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
    </>
  );
}
