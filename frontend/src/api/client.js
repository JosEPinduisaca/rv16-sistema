import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Agrega el token guardado a cada petición automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rv16_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expiró o es inválido, cierra sesión automáticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rv16_token');
      localStorage.removeItem('rv16_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
