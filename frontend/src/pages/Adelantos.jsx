import { useEffect, useState } from 'react';
import api from '../api/client';
import TarjetaEstado from '../components/TarjetaEstado';

const MAX_DIAS_DEGRADADO = 14; // a partir de estos días, el color queda en naranja tope
const COLOR_INICIO = [255, 247, 224]; // crema
const COLOR_FIN = [251, 146, 60]; // naranja

function diasDesde(fechaISO) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaISO);
  fecha.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((hoy - fecha) / (1000 * 60 * 60 * 24)));
}

function colorPorAntiguedad(dias) {
  const ratio = Math.min(dias / MAX_DIAS_DEGRADADO, 1);
  const [r1, g1, b1] = COLOR_INICIO;
  const [r2, g2, b2] = COLOR_FIN;
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Adelantos() {
  const [arbitros, setArbitros] = useState([]);
  const [todos, setTodos] = useState([]);
  const [arbitroSeleccionado, setArbitroSeleccionado] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState(null);

  function cargarTodos() {
    api.get('/adelantos').then((res) => setTodos(res.data));
  }

  useEffect(() => {
    api.get('/arbitros').then((res) => setArbitros(res.data));
    cargarTodos();
  }, []);

  async function solicitar(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/adelantos', { arbitro_id: arbitroSeleccionado, monto: Number(monto) });
      setMonto('');
      cargarTodos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al solicitar el adelanto');
    }
  }

  async function cambiarEstado(id, estado) {
    try {
      await api.put(`/adelantos/${id}/estado`, { estado });
      cargarTodos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el adelanto');
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h1 className="font-display text-2xl font-semibold text-navy-900 mb-2">Adelantos</h1>
        <p className="text-xs text-gray-500 mb-4">
          Ordenados por prioridad: los pendientes más antiguos primero. El color indica cuánto
          tiempo llevan esperando —
          <span className="inline-block w-3 h-3 rounded-sm align-middle mx-1" style={{ backgroundColor: colorPorAntiguedad(0) }} />
          recién pedido →
          <span className="inline-block w-3 h-3 rounded-sm align-middle mx-1" style={{ backgroundColor: colorPorAntiguedad(MAX_DIAS_DEGRADADO) }} />
          {MAX_DIAS_DEGRADADO}+ días esperando.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Árbitro</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fecha pedida</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Espera</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Monto</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {todos.map((a) => {
                const dias = diasDesde(a.fecha_solicitud);
                const esPendiente = a.estado === 'pendiente';
                return (
                  <tr
                    key={a.id}
                    className="border-t border-gray-100"
                    style={esPendiente ? { backgroundColor: colorPorAntiguedad(dias) } : undefined}
                  >
                    <td className="px-4 py-2.5 font-medium text-navy-900 whitespace-nowrap">{a.nombres} {a.apellidos}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{a.fecha_solicitud?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {esPendiente ? `${dias} día${dias === 1 ? '' : 's'}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-navy-900">${a.monto}</td>
                    <td className="px-4 py-2.5"><TarjetaEstado estado={a.estado} /></td>
                    <td className="px-4 py-2.5">
                      {esPendiente && (
                        <div className="flex gap-2 whitespace-nowrap">
                          <button
                            onClick={() => cambiarEstado(a.id, 'aprobado')}
                            className="text-pitch-green-dark hover:underline text-xs font-medium"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => cambiarEstado(a.id, 'rechazado')}
                            className="text-card-red-dark hover:underline text-xs font-medium"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {todos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Aún no hay adelantos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">Registrar adelanto</h2>
        <form onSubmit={solicitar} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Árbitro</label>
            <select
              required
              value={arbitroSeleccionado}
              onChange={(e) => setArbitroSeleccionado(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="">Selecciona...</option>
              {arbitros.map((a) => (
                <option key={a.id} value={a.id}>{a.nombres} {a.apellidos}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Monto ($)</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
          <button className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition">
            Registrar
          </button>
        </form>
      </div>
    </div>
  );
}
