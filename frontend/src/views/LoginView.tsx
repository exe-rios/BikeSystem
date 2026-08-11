import { useState } from 'react';

interface LoginViewProps {
    onLoginSuccess: (token: string, usuarioNombre: string) => void;
}

const API_URL = 'http://localhost:3000';

export function LoginView({ onLoginSuccess }: LoginViewProps) {
    // Cambiamos 'email' por 'usuario' para ser coherentes con la BD
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        if (!usuario || !password) {
            setError('Por favor, completa todos los campos.');
            setCargando(false);
            return;
        }

        try {
            // 💡 Se cambió '/api/auth/login' por '/api/login' para coincidir con tu backend
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre_usuario: usuario,
                    contrasena: password
                })
            });

            // Validación defensiva por si el servidor no devuelve JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Ruta no encontrada en el backend (Estado ${response.status}). Revisa las rutas de Express.`);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.mensaje || data.error || 'Credenciales incorrectas');
            }

            // Guardamos el token JWT REAL generado por el backend
            localStorage.setItem('token', data.token);

            // Notificamos al estado global
            // (Si tu backend devuelve 'data.usuario.nombre_usuario', ajusta el fallback)
            const nombreMostrar = data.usuario?.nombre || data.usuario?.nombre_usuario || usuario;
            onLoginSuccess(data.token, nombreMostrar);

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Error de conexión con el servidor.');
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            width: '100vw', height: '100vh', backgroundColor: 'var(--bg-principal)'
        }}>
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

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
        </div>
    );
}