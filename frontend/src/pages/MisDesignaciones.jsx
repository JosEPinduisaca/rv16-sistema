import { useEffect, useState } from 'react';
import api from '../api/client';
import TarjetaEstado from '../components/TarjetaEstado';

// Misma familia de colores que en Designación General, con un poco más de
// presencia (franja de color a la izquierda + fondo con más contraste).
const PALETA = [
  { punto: 'bg-accent-navy', borde: 'border-l-accent-navy', fila: 'bg-accent-navy/10' },
  { punto: 'bg-pitch-green', borde: 'border-l-pitch-green', fila: 'bg-pitch-green/10' },
  { punto: 'bg-accent-orange', borde: 'border-l-accent-orange', fila: 'bg-accent-orange/10' },
  { punto: 'bg-accent-teal', borde: 'border-l-accent-teal', fila: 'bg-accent-teal/10' },
  { punto: 'bg-accent-purple', borde: 'border-l-accent-purple', fila: 'bg-accent-purple/10' },
  { punto: 'bg-accent-slate', borde: 'border-l-accent-slate', fila: 'bg-accent-slate/10' },
  { punto: 'bg-card-red-dark', borde: 'border-l-card-red-dark', fila: 'bg-card-red-dark/10' },
];

function esPasado(fecha, hora) {
  return new Date(`${fecha}T${hora}`) < new Date();
}

export default function MisDesignaciones() {
  const [designaciones, setDesignaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState('proximas'); // 'proximas' | 'historial'
  const [fechaFiltro, setFechaFiltro] = useState('');

  useEffect(() => {
    api.get('/arbitros/me').then((res) => {
      api.get(`/designaciones/arbitro/${res.data.id}`).then((r) => {
        setDesignaciones(r.data);
        setCargando(false);
      });
    });
  }, []);

  // Le asigna un color fijo a cada torneo (el mismo cada vez que aparece)
  const torneosUnicos = [...new Set(designaciones.map((d) => d.campeonato_nombre))];
  const colorPorTorneo = {};
  torneosUnicos.forEach((t, i) => { colorPorTorneo[t] = PALETA[i % PALETA.length]; });

  const designacionesOrdenadas = [...designaciones].sort(
    (a, b) => new Date(`${a.fecha}T${a.hora}`) - new Date(`${b.fecha}T${b.hora}`)
  );

  const designacionesMostradas = modo === 'proximas'
    ? designacionesOrdenadas.filter((d) => !esPasado(d.fecha, d.hora))
    : designacionesOrdenadas
        .filter((d) => esPasado(d.fecha, d.hora))
        .filter((d) => !fechaFiltro || d.fecha?.slice(0, 10) === fechaFiltro)
        .reverse(); // en historial, lo más reciente primero

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <h1 className="font-display text-2xl font-semibold text-navy-900">Mis designaciones</h1>
        <div className="flex items-end flex-wrap gap-3">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
            {[
              { value: 'proximas', label: 'Próximas' },
              { value: 'historial', label: 'Historial' },
            ].map((op) => (
              <button
                key={op.value}
                onClick={() => { setModo(op.value); setFechaFiltro(''); }}
                className={`px-3 py-1.5 font-medium transition ${
                  modo === op.value ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
          {modo === 'historial' && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Buscar una fecha específica</label>
              <input
                type="date"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
          )}
        </div>
      </div>

      {torneosUnicos.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs text-gray-500">
          {torneosUnicos.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${colorPorTorneo[t].punto}`} />
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-left">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Torneo</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fecha</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Hora</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Cancha</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Rol</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody>
            {designacionesMostradas.map((d) => {
              const color = colorPorTorneo[d.campeonato_nombre] || PALETA[0];
              const pasado = esPasado(d.fecha, d.hora);
              return (
                <tr
                  key={d.id}
                  className={`border-t border-gray-100 border-l-4 ${color.borde} ${
                    pasado ? 'bg-gray-50 opacity-60' : color.fila
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${color.punto}`} />
                      <span className="text-navy-900 font-medium">{d.campeonato_nombre}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{d.fecha?.slice(0, 10)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{d.hora}</td>
                  <td className="px-4 py-2.5">{d.cancha}</td>
                  <td className="px-4 py-2.5 capitalize">{d.rol_designacion}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <TarjetaEstado estado={d.estado} />
                      {pasado && <span className="text-[10px] text-gray-400 uppercase tracking-wide">Cumplido</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {designacionesMostradas.length === 0 && !cargando && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  {modo === 'proximas'
                    ? 'No tienes designaciones próximas'
                    : fechaFiltro
                      ? 'No hay designaciones en esa fecha'
                      : 'Aún no tienes designaciones anteriores'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
