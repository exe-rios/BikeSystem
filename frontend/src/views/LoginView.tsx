import { useState } from 'react';

interface LoginViewProps {
    onLoginSuccess: (token: string, usuarioEmail: string, usuarioNombre: string) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        if (!email || !password) {
            setError('Por favor, completa todos los campos.');
            setCargando(false);
            return;
        }

        try {
            // --- SIMULACIÓN DE BACKEND (Cambiar por tu FETCH real más adelante) ---
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Simula un segundo de delay

            if (email === 'admin@bikesystem.com' && password === 'admin123') {
                // Al tener éxito pasamos Token ficticio, Email y Nombre a mostrar
                onLoginSuccess('fake-jwt-token-xyz123', 'admin@bikesystem.com', 'Admin User');
            } else {
                setError('Credenciales incorrectas. (Prueba con admin@bikesystem.com / admin123)');
            }
            // ---------------------------------------------------------------------
        } catch (err) {
            setError('Error de conexión con el servidor.');
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
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            placeholder="nombre@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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