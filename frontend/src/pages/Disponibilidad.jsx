import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import TarjetaEstado from '../components/TarjetaEstado';

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function Disponibilidad() {
  const { t } = useTranslation(['disponibilidad', 'common']);
  const [arbitroId, setArbitroId] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState({ fecha: '', disponible: true, comentario: '' });
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  function cargar(id) {
    api.get(`/arbitros/${id}/disponibilidad`).then((res) => setRegistros(res.data));
  }

  useEffect(() => {
    api.get('/arbitros/me').then((res) => {
      setArbitroId(res.data.id);
      cargar(res.data.id);
    });
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api.put(`/arbitros/${arbitroId}/disponibilidad`, form);
      setMensaje(t('mensajes.guardado'));
      cargar(arbitroId);
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorGuardar'));
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h1 className="font-display text-2xl font-semibold text-navy-900 mb-2">{t('titulo')}</h1>
        <p className="text-sm text-gray-500 mb-5">{t('subtitulo')}</p>

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.fecha')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.disponible')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.comentario')}</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                  <td className="px-4 py-2.5">{r.fecha?.slice(0, 10)}</td>
                  <td className="px-4 py-2.5">
                    <TarjetaEstado estado={r.disponible ? 'si' : 'no'} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{r.comentario || '—'}</td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">
                    {t('vacio')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">{t('registrarDia')}</h2>
        <form onSubmit={guardar} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('campos.fecha')}</label>
            <input
              type="date" required
              min={hoyISO()}
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('campos.disponiblePregunta')}</label>
            <select
              value={form.disponible ? 'si' : 'no'}
              onChange={(e) => {
                const disponible = e.target.value === 'si';
                setForm({ ...form, disponible, comentario: disponible ? '' : form.comentario });
              }}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="si">{t('campos.siDisponible')}</option>
              <option value="no">{t('campos.noDisponible')}</option>
            </select>
          </div>
          {!form.disponible && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('campos.motivo')}</label>
            <input
              value={form.comentario}
              onChange={(e) => setForm({ ...form, comentario: e.target.value })}
              placeholder={t('campos.motivoPlaceholder')}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          )}
          {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
          {mensaje && <p className="text-xs text-pitch-green-dark bg-pitch-green/10 px-2 py-1.5 rounded">{mensaje}</p>}
          <button className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition">
            {t('common:acciones.guardar')}
          </button>
        </form>
      </div>
    </div>
  );
}
