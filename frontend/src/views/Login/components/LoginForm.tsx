import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import logoDnBike from '../../../assets/Fotinhos/iconoDnBike.jpeg';


interface LoginFormProps {
  usuario: string;
  setUsuario: (u: string) => void;
  password: string;
  setPassword: (p: string) => void;
  error: string;
  cargando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** Formulario controlado de acceso con usuario y contraseña. */
export function LoginForm({
  usuario,
  setUsuario,
  password,
  setPassword,
  error,
  cargando,
  onSubmit
}: LoginFormProps) {
  const [mostrarPassword, setMostrarPassword] = useState(false);

  return (
    <div style={{
      backgroundColor: 'var(--bg-tarjeta)', padding: '40px 32px', borderRadius: '16px',
      width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
      border: '1px solid var(--borde-input)', color: 'var(--texto-principal)',
      boxSizing: 'border-box'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img
          src={logoDnBike}
          alt="Logo BikeSystem"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            objectFit: 'contain',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            marginBottom: '12px'
          }}
        />
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--texto-principal)' }}>
          BikeSystem
        </h2>
        <p style={{ color: 'var(--texto-mutado)', margin: 0, fontSize: '0.88rem' }}>
          Sistema de Gestión Integral • Iniciar Sesión
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
            autoFocus
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
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={mostrarPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '11px 40px 11px 14px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--texto-mutado)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--texto-principal)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--texto-mutado)')}
              title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={cargando}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#ffffff', border: 'none', padding: '12px',
            borderRadius: '8px', fontWeight: '600', fontSize: '0.95rem', cursor: cargando ? 'not-allowed' : 'pointer',
            marginTop: '8px', transition: 'opacity 0.2s', opacity: cargando ? 0.7 : 1
          }}
        >
          {cargando ? 'Verificando credenciales...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
}

