export interface LoginSuccessUser {
  id: number;
  nombre: string;
  rol: string;
}

export interface LoginViewProps {
  onLoginSuccess: (token: string, usuario: LoginSuccessUser) => void;
}
