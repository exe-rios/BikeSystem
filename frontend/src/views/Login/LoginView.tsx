import type { LoginViewProps } from './types';
import { useLogin } from './hooks/useLogin';
import { LoginForm } from './components/LoginForm';

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const {
    usuario,
    password,
    error,
    cargando,
    setUsuario,
    setPassword,
    handleSubmit
  } = useLogin(onLoginSuccess);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--bg-principal)'
    }}>
      <LoginForm
        usuario={usuario}
        setUsuario={setUsuario}
        password={password}
        setPassword={setPassword}
        error={error}
        cargando={cargando}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
