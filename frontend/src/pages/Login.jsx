import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { validarEmail } from '../utils/validaciones';

export default function Login() {
  const { t } = useTranslation(['login', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorEmail, setErrorEmail] = useState(null);
  const { login, cargando, error } = useAuth();
  const navigate = useNavigate();

  const [modalOlvide, setModalOlvide] = useState(false);
  const [emailOlvide, setEmailOlvide] = useState('');
  const [errorEmailOlvide, setErrorEmailOlvide] = useState(null);
  const [enviandoOlvide, setEnviandoOlvide] = useState(false);
  const [mensajeOlvide, setMensajeOlvide] = useState(null);
  const [errorOlvide, setErrorOlvide] = useState(null);

  function alPerderFocoEmail() {
    setErrorEmail(validarEmail(email) ? null : t('validacion.emailInvalido'));
  }

  function alPerderFocoEmailOlvide() {
    setErrorEmailOlvide(validarEmail(emailOlvide) ? null : t('validacion.emailInvalido'));
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    const exito = await login(email, password);
    if (exito) navigate('/');
  }

  function abrirOlvide() {
    setModalOlvide(true);
    setEmailOlvide(email); // por si ya lo había escrito arriba
    setErrorEmailOlvide(null);
    setMensajeOlvide(null);
    setErrorOlvide(null);
  }

  async function enviarOlvide(e) {
    e.preventDefault();
    setEnviandoOlvide(true);
    setErrorOlvide(null);
    setMensajeOlvide(null);
    try {
      const { data } = await api.post('/auth/olvide-password', { email: emailOlvide });
      setMensajeOlvide(data.mensaje);
    } catch (err) {
      setErrorOlvide(err.response?.data?.error || t('mensajes.errorSolicitud'));
    } finally {
      setEnviandoOlvide(false);
    }
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
        <img src="/logo-rv16.png" alt={t('alt.escudo')} className="w-48 h-48 object-contain relative drop-shadow-lg" />
        <h1 className="font-display text-3xl font-semibold mt-6 relative text-center">
          REFEREES DEL VALLE
        </h1>
        <p className="text-navy-100 text-sm mt-2 relative tracking-wide">
          {t('panelIzquierdo.subtitulo')}
        </p>
        <div className="absolute bottom-8 text-navy-500 text-xs tracking-widest uppercase">
          {t('panelIzquierdo.fundado')}
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex items-center justify-center px-6 bg-navy-50">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex flex-col items-center mb-8">
            <img src="/logo-rv16.png" alt={t('alt.escudo')} className="w-20 h-20 object-contain" />
          </div>

          <h2 className="font-display text-2xl font-semibold text-navy-900 mb-1">
            {t('titulo')}
          </h2>
          <p className="text-sm text-gray-500 mb-8">{t('subtitulo')}</p>

          <form onSubmit={manejarEnvio} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-navy-700 uppercase tracking-wide mb-1.5">
                {t('campos.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={alPerderFocoEmail}
                required
                className={`w-full border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition ${errorEmail ? 'border-card-red' : 'border-gray-300'}`}
                placeholder={t('campos.emailPlaceholder')}
              />
              {errorEmail && <p className="text-[11px] text-card-red-dark mt-1">{errorEmail}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 uppercase tracking-wide mb-1.5">
                {t('campos.contrasena')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition"
                placeholder={t('campos.contrasenaPlaceholder')}
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
              {cargando ? t('botones.ingresando') : t('botones.ingresar')}
            </button>

            <button
              type="button"
              onClick={abrirOlvide}
              className="w-full text-center text-xs text-navy-600 hover:underline"
            >
              {t('botones.olvideContrasena')}
            </button>
          </form>
        </div>
      </div>

      {/* Modal: olvidé mi contraseña */}
      {modalOlvide && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg font-semibold text-navy-900">{t('modal.titulo')}</h3>
              <button
                onClick={() => setModalOlvide(false)}
                aria-label={t('modal.cerrarAriaLabel')}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {t('modal.descripcion')}
            </p>
            {mensajeOlvide ? (
              <div className="bg-pitch-green/10 text-pitch-green-dark text-sm px-3 py-2 rounded-md">
                {mensajeOlvide}
              </div>
            ) : (
              <form onSubmit={enviarOlvide} className="space-y-3">
                <input
                  type="email"
                  required
                  autoFocus
                  value={emailOlvide}
                  onChange={(e) => setEmailOlvide(e.target.value)}
                  onBlur={alPerderFocoEmailOlvide}
                  placeholder={t('campos.emailPlaceholder')}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${errorEmailOlvide ? 'border-card-red' : 'border-gray-300'}`}
                />
                {errorEmailOlvide && <p className="text-[11px] text-card-red-dark -mt-1.5">{errorEmailOlvide}</p>}
                {errorOlvide && (
                  <div className="bg-card-red/10 border border-card-red/30 text-card-red-dark text-sm px-3 py-2 rounded-md">
                    {errorOlvide}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={enviandoOlvide}
                  className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded-md text-sm font-semibold transition disabled:opacity-50"
                >
                  {enviandoOlvide ? t('modal.enviando') : t('modal.enviar')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
