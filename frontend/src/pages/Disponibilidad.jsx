import { useEffect, useState } from 'react';
import api from '../api/client';

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function Disponibilidad() {
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
      setMensaje('Disponibilidad guardada');
      cargar(arbitroId);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la disponibilidad');
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h1 className="font-display text-2xl font-semibold text-navy-900 mb-2">Mi disponibilidad</h1>
        <p className="text-sm text-gray-500 mb-5">
          Marca los días en que no puedes ser designado. Por defecto se asume que estás disponible.
        </p>

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Disponible</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                  <td className="px-4 py-2.5">{r.fecha?.slice(0, 10)}</td>
                  <td className="px-4 py-2.5">
                    {r.disponible ? (
                      <span className="text-pitch-green-dark font-medium">Sí</span>
                    ) : (
                      <span className="text-card-red-dark font-medium">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{r.comentario || '—'}</td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Aún no has registrado disponibilidad
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">Registrar un día</h2>
        <form onSubmit={guardar} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fecha</label>
            <input
              type="date" required
              min={hoyISO()}
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">¿Estás disponible?</label>
            <select
              value={form.disponible ? 'si' : 'no'}
              onChange={(e) => {
                const disponible = e.target.value === 'si';
                setForm({ ...form, disponible, comentario: disponible ? '' : form.comentario });
              }}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="si">Sí, disponible</option>
              <option value="no">No disponible</option>
            </select>
          </div>
          {!form.disponible && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">¿Por qué no puedes? (opcional)</label>
            <input
              value={form.comentario}
              onChange={(e) => setForm({ ...form, comentario: e.target.value })}
              placeholder="Ej: viaje familiar"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          )}
          {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
          {mensaje && <p className="text-xs text-pitch-green-dark bg-pitch-green/10 px-2 py-1.5 rounded">{mensaje}</p>}
          <button className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition">
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
