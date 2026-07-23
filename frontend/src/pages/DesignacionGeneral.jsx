import { useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import TarjetaEstado from '../components/TarjetaEstado';

const PALETA = [
  'bg-accent-navy',
  'bg-pitch-green',
  'bg-accent-orange',
  'bg-accent-teal',
  'bg-accent-purple',
  'bg-accent-slate',
  'bg-card-red-dark',
];

export default function DesignacionGeneral() {
  const { usuario } = useAuth();
  const puedeGestionar = usuario?.rol === 'administrador' || usuario?.rol === 'directivo';
  const [fecha, setFecha] = useState('');
  const [encuentros, setEncuentros] = useState([]);
  const [arbitros, setArbitros] = useState([]);
  const [arbitroResaltado, setArbitroResaltado] = useState('');
  const [cargando, setCargando] = useState(true);

  function cargar(f) {
    setCargando(true);
    const url = f ? `/encuentros/general?fecha=${f}` : '/encuentros/general';
    api.get(url).then((res) => {
      setEncuentros(res.data);
      setCargando(false);
    });
  }

  useEffect(() => {
    cargar(fecha);
    if (puedeGestionar) {
      api.get('/arbitros').then((res) => setArbitros(res.data));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function quitarDesignacion(designacionId) {
    if (!window.confirm('¿Quitar esta designación?')) return;
    try {
      await api.delete(`/designaciones/${designacionId}`);
      cargar(fecha);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al quitar la designación');
    }
  }

  const grupos = encuentros.reduce((acc, e) => {
    const clave = e.campeonato_nombre;
    if (!acc[clave]) acc[clave] = [];
    acc[clave].push(e);
    return acc;
  }, {});

  const nombresGrupos = Object.keys(grupos);

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">Designación general</h1>
          <p className="text-sm text-gray-500 mt-1">Cronograma completo del día, todas las canchas</p>
          <p className="text-xs text-gray-500 mt-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-card-red/25 align-middle mr-1" />
            Sin designar
            <span className="inline-block w-3 h-3 rounded-sm bg-pitch-green/25 align-middle ml-4 mr-1" />
            Ya designado
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {puedeGestionar && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Resaltar árbitro</label>
              <select
                value={arbitroResaltado}
                onChange={(e) => setArbitroResaltado(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              >
                <option value="">Ninguno</option>
                {arbitros.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombres} {a.apellidos}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Filtrar por fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); cargar(e.target.value); }}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
        </div>
      </div>

      {cargando && <p className="text-sm text-gray-500">Cargando...</p>}

      {!cargando && nombresGrupos.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-8 text-center text-gray-400 text-sm">
          No hay encuentros {fecha ? 'para esa fecha' : 'registrados'}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {nombresGrupos.map((torneo, i) => {
          const colorClase = PALETA[i % PALETA.length];
          return (
            <div key={torneo} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className={`${colorClase} text-white px-3 py-2`}>
                <p className="font-display text-sm font-semibold tracking-wide truncate">{torneo}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {grupos[torneo].map((p) => {
                  const tieneResaltado = arbitroResaltado && p.designados.some(
                    (d) => String(d.arbitro_id) === String(arbitroResaltado)
                  );
                  const sinDesignar = p.designados.length === 0;
                  let claseFila = sinDesignar
                    ? 'bg-card-red/5'   // sin designar todavía: se necesita atención
                    : 'bg-pitch-green/5'; // ya tiene al menos un árbitro asignado
                  if (tieneResaltado) {
                    claseFila = 'bg-card-yellow/20 ring-1 ring-inset ring-card-yellow-dark/40';
                  }
                  return (
                    <div
                      key={p.id}
                      className={`px-3 py-2.5 text-xs flex items-start gap-3 ${claseFila}`}
                    >
                      <span className="tabular-nums font-semibold text-navy-900 whitespace-nowrap pt-0.5">
                        {p.hora?.slice(0, 5)}
                      </span>
                      <span className="text-gray-500 whitespace-nowrap pt-0.5">{p.cancha}</span>
                      <div className="flex-1 min-w-0">
                        {p.designados.length === 0 ? (
                          <span className="text-gray-300 italic">sin designar</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {p.designados.map((d, idx) => {
                              const esResaltado = arbitroResaltado && String(d.arbitro_id) === String(arbitroResaltado);
                              return (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span className={esResaltado ? 'font-semibold text-navy-900' : 'text-navy-800'}>
                                    {d.nombre} <span className="text-gray-400">· {d.rol}</span>
                                  </span>
                                  {puedeGestionar && (
                                    <button
                                      onClick={() => quitarDesignacion(d.designacion_id)}
                                      title="Quitar designación"
                                      className="text-gray-300 hover:text-card-red transition"
                                    >
                                      <IconX size={12} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <TarjetaEstado estado={p.estado} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
