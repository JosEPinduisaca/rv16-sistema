import axios from 'axios';
import { iniciarCarga, finalizarCarga } from './cargaGlobal';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Agrega el token guardado a cada petición automáticamente, y arranca el
// bloqueo de pantalla global. Las peticiones marcadas como `silencioso: true`
// (ej. el polling de conversación en LiquidacionDetalle) no bloquean la
// pantalla, para no interrumpir al usuario con una actualización de fondo.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rv16_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.silencioso) {
    iniciarCarga();
  }
  return config;
});

// Si el token de una sesión YA INICIADA expiró o dejó de ser válido, cierra
// sesión automáticamente. Esto NO debe aplicar al propio intento de login
// (o a "olvidé mi contraseña"), que también puede responder 401 por
// credenciales incorrectas: ahí el mensaje de error debe mostrarse en el
// formulario, no disparar una redirección que lo borre antes de verse.
const RUTAS_PUBLICAS_AUTH = ['/auth/login', '/auth/olvide-password', '/auth/restablecer-password'];

api.interceptors.response.use(
  (response) => {
    if (!response.config?.silencioso) {
      finalizarCarga();
    }
    return response;
  },
  (error) => {
    if (!error.config?.silencioso) {
      finalizarCarga();
    }
    const esRutaPublica = RUTAS_PUBLICAS_AUTH.some((ruta) => error.config?.url?.includes(ruta));
    if (error.response?.status === 401 && !esRutaPublica) {
      localStorage.removeItem('rv16_token');
      localStorage.removeItem('rv16_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;