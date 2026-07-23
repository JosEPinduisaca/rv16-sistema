import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, cargando, error } = useAuth();
  const navigate = useNavigate();

  async function manejarEnvio(e) {
    e.preventDefault();
    const exito = await login(email, password);
    if (exito) navigate('/');
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Panel izquierdo: identidad */}
      <div className="hidden md:flex flex-col items-center justify-center bg-navy-900 text-white relative overflow-hidden px-12">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <img src="/logo-rv16.png" alt="Escudo RV16" className="w-48 h-48 object-contain relative drop-shadow-lg" />
        <h1 className="font-display text-3xl font-semibold mt-6 relative text-center">
          REFEREES DEL VALLE
        </h1>
        <p className="text-navy-100 text-sm mt-2 relative tracking-wide">
          Sistema de gestión de designaciones y pagos
        </p>
        <div className="absolute bottom-8 text-navy-500 text-xs tracking-widest uppercase">
          Fundado el 16 de mayo del 2018
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex items-center justify-center px-6 bg-navy-50">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex flex-col items-center mb-8">
            <img src="/logo-rv16.png" alt="Escudo RV16" className="w-20 h-20 object-contain" />
          </div>

          <h2 className="font-display text-2xl font-semibold text-navy-900 mb-1">
            Iniciar sesión
          </h2>
          <p className="text-sm text-gray-500 mb-8">Ingresa con tu cuenta del núcleo arbitral</p>

          <form onSubmit={manejarEnvio} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-navy-700 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition"
                placeholder="tu@rv16.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 uppercase tracking-wide mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-card-red/10 border border-card-red/30 text-card-red-dark text-sm px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2.5 rounded-md text-sm font-semibold transition disabled:opacity-50"
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
