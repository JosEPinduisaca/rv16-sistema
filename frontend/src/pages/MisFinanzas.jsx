import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import useCargaActiva from '../hooks/useCargaActiva';
import { esMontoPositivo } from '../utils/validaciones';
import TarjetaEstado from '../components/TarjetaEstado';

export default function MisFinanzas() {
  const { t } = useTranslation(['misFinanzas', 'common']);
  const [arbitroId, setArbitroId] = useState(null);
  const [adelantos, setAdelantos] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [monto, setMonto] = useState('');
  const [error, setError] = useState(null);
  const [errorMonto, setErrorMonto] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const cargaActiva = useCargaActiva();

  function cargarTodo(id) {
    api.get(`/adelantos/arbitro/${id}`).then((res) => setAdelantos(res.data));
    api.get(`/liquidaciones/arbitro/${id}`).then((res) => setLiquidaciones(res.data));
  }

  useEffect(() => {
    api.get('/arbitros/me').then((res) => {
      setArbitroId(res.data.id);
      cargarTodo(res.data.id);
    });
  }, []);

  function alPerderFocoMonto() {
    setErrorMonto(esMontoPositivo(monto) ? null : t('validacion.montoInvalido'));
  }

  async function solicitar(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api.post('/adelantos', { arbitro_id: arbitroId, monto: Number(monto) });
      setMensaje(t('mensajes.solicitudEnviada'));
      setMonto('');
      setErrorMonto(null);
      cargarTodo(arbitroId);
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorSolicitar'));
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900 mb-5">{t('titulo')}</h1>

          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">{t('misLiquidaciones')}</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-navy-700 text-left">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnasLiquidaciones.periodo')}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnasLiquidaciones.neto')}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnasLiquidaciones.estado')}</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {liquidaciones.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {l.fecha_inicio?.slice(0, 10)} → {l.fecha_fin?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-navy-900">${l.monto_neto}</td>
                    <td className="px-4 py-2.5"><TarjetaEstado estado={l.estado} /></td>
                    <td className="px-4 py-2.5">
                      <Link to={`/liquidaciones/${l.id}`} className="text-navy-600 hover:underline text-xs font-medium">
                        {t('common:acciones.ver')}
                      </Link>
                    </td>
                  </tr>
                ))}
                {liquidaciones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                      {t('vacio.liquidaciones')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">{t('misAdelantos')}</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-navy-700 text-left">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnasAdelantos.fecha')}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnasAdelantos.monto')}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnasAdelantos.estado')}</th>
                </tr>
              </thead>
              <tbody>
                {adelantos.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                    <td className="px-4 py-2.5">{a.fecha_solicitud?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 tabular-nums">${a.monto}</td>
                    <td className="px-4 py-2.5"><TarjetaEstado estado={a.estado} /></td>
                  </tr>
                ))}
                {adelantos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">
                      {t('vacio.adelantos')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">{t('solicitarAdelanto')}</h2>
        <form onSubmit={solicitar} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('campos.monto')}</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              onBlur={alPerderFocoMonto}
              className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${errorMonto ? 'border-card-red' : 'border-gray-300'}`}
            />
            {errorMonto && <p className="text-[11px] text-card-red-dark mt-1">{errorMonto}</p>}
          </div>
          {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
          {mensaje && <p className="text-xs text-pitch-green-dark bg-pitch-green/10 px-2 py-1.5 rounded">{mensaje}</p>}
          <button
            disabled={cargaActiva}
            className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('botones.solicitar')}
          </button>
        </form>
      </div>
    </div>
  );
}
