import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function RestablecerPassword() {
  const { t } = useTranslation(['restablecerPassword', 'common']);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errorConfirmar, setErrorConfirmar] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  function alPerderFocoConfirmar() {
    setErrorConfirmar(!confirmar || confirmar === password ? null : t('mensajes.contrasenasNoCoinciden'));
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    if (password !== confirmar) {
      setError(t('mensajes.contrasenasNoCoinciden'));
      return;
    }

    setEnviando(true);
    try {
      const { data } = await api.post('/auth/restablecer-password', {
        token,
        password_nueva: password,
      });
      setMensaje(data.mensaje);
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorRestablecer'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-50 px-6">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="font-display text-xl font-semibold text-navy-900 mb-1">{t('titulo')}</h1>

        {!token && (
          <p className="text-sm text-card-red-dark bg-card-red/10 px-3 py-2 rounded-md mt-3">
            {t('enlaceInvalido')}
          </p>
        )}

        {token && mensaje && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-pitch-green-dark bg-pitch-green/10 px-3 py-2 rounded-md">{mensaje}</p>
            <Link
              to="/login"
              className="block text-center w-full bg-navy-900 hover:bg-navy-800 text-white py-2.5 rounded-md text-sm font-semibold transition"
            >
              {t('irIniciarSesion')}
            </Link>
          </div>
        )}

        {token && !mensaje && (
          <>
            <p className="text-sm text-gray-500 mb-6">{t('subtitulo')}</p>
            <form onSubmit={manejarEnvio} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy-700 uppercase tracking-wide mb-1.5">
                  {t('campos.nuevaContrasena')}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('campos.contrasenaPlaceholder')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 uppercase tracking-wide mb-1.5">
                  {t('campos.confirmarContrasena')}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  onBlur={alPerderFocoConfirmar}
                  placeholder={t('campos.contrasenaPlaceholder')}
                  className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${errorConfirmar ? 'border-card-red' : 'border-gray-300'}`}
                />
                {errorConfirmar && <p className="text-[11px] text-card-red-dark mt-1">{errorConfirmar}</p>}
              </div>
              {error && (
                <div className="bg-card-red/10 border border-card-red/30 text-card-red-dark text-sm px-3 py-2 rounded-md">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2.5 rounded-md text-sm font-semibold transition disabled:opacity-50"
              >
                {enviando ? t('botones.guardando') : t('botones.guardar')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
