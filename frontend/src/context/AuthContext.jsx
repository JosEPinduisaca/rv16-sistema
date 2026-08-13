import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
  const guardado = localStorage.getItem('rv16_usuario');
  if (!guardado) return null;
  try {
    return JSON.parse(guardado);
  } catch {
    localStorage.removeItem('rv16_usuario');
    localStorage.removeItem('rv16_token');
    return null;
  }
});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function login(email, password) {
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('rv16_token', data.token);
      localStorage.setItem('rv16_usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
      return false;
    } finally {
      setCargando(false);
    }
  }

  function logout() {
    localStorage.removeItem('rv16_token');
    localStorage.removeItem('rv16_usuario');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return contexto;
}
