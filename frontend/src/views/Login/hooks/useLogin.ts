import { useState, useCallback } from 'react';
import type { LoginSuccessUser } from '../types';
import { api } from '../../../services/api';

export function useLogin(onLoginSuccess: (token: string, usuario: LoginSuccessUser) => void) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!usuario.trim() || !password) {
      setError('Escribí tu usuario y contraseña.');
      return;
    }

    setCargando(true);
    try {
      const data = await api.auth.login(usuario.trim(), password);
      onLoginSuccess(data.token, data.usuario);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo conectar al servidor. ¿Está encendido?');
      }
    } finally {
      setCargando(false);
    }
  }, [usuario, password, onLoginSuccess]);

  return {
    usuario,
    password,
    error,
    cargando,
    setUsuario,
    setPassword,
    handleSubmit
  };
}
