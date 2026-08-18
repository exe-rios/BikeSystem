import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface AuthUser {
  id_usuario: number;
  nombre_usuario: string;
  rol: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, usuario: { id: number; nombre: string; rol: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem('usuario');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      return { id_usuario: 1, nombre_usuario: savedName, rol: 'ADMIN' };
    }
    return null;
  });

  const login = (tokenRecibido: string, usuarioRecibido: { id: number; nombre: string; rol: string }) => {
    const authUser: AuthUser = {
      id_usuario: usuarioRecibido.id,
      nombre_usuario: usuarioRecibido.nombre,
      rol: usuarioRecibido.rol,
    };

    localStorage.setItem('token', tokenRecibido);
    localStorage.setItem('usuario', JSON.stringify(authUser));
    localStorage.setItem('userName', authUser.nombre_usuario);

    setToken(tokenRecibido);
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');

    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
