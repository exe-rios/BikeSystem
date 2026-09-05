interface LoginFormProps {
  usuario: string;
  setUsuario: (u: string) => void;
  password: string;
  setPassword: (p: string) => void;
  error: string;
  cargando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginForm({
  usuario,
  setUsuario,
  password,
  setPassword,
  error,
  cargando,
  onSubmit
}: LoginFormProps) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-tarjeta)', padding: '40px', borderRadius: '16px',
      width: '100%', maxWidth: '380px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
      border: '1px solid var(--borde-input)', color: 'var(--texto-principal)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--texto-principal)' }}>
          Bike System
        </h2>
        <p style={{ color: 'var(--texto-mutado)', margin: 0, fontSize: '0.88rem' }}>
          Ingresa al panel de control
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444',
          color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
            Nombre de Usuario
          </label>
          <input
            type="text"
            placeholder="Ej: admin"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid var(--borde-input)',
              backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem', boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
            Contraseña
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid var(--borde-input)',
              backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem', boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#ffffff', border: 'none', padding: '12px',
            borderRadius: '8px', fontWeight: '600', fontSize: '0.95rem', cursor: cargando ? 'not-allowed' : 'pointer',
            marginTop: '10px', transition: 'opacity 0.2s', opacity: cargando ? 0.7 : 1
          }}
        >
          {cargando ? 'Verificando...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
}
