/** Tipos e interfaces del flujo de inicio de sesión. */
export interface LoginSuccessUser {
  id: number;
  nombre: string;
  rol: string;
}

export interface LoginViewProps {
  onLoginSuccess: (token: string, usuario: LoginSuccessUser) => void;
}
