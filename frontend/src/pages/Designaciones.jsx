import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconStarFilled } from '@tabler/icons-react';
import api from '../api/client';
import TarjetaEstado from '../components/TarjetaEstado';

const ETIQUETA_ROL = { central: 'Central', asistente: 'Asistente' };

export default function Designaciones() {
  const [searchParams] = useSearchParams();
  const [encuentrosDisponibles, setEncuentrosDisponibles] = useState([]); // solo los que aún tienen cupo
  const [rolesPorEncuentro, setRolesPorEncuentro] = useState({}); // { encuentroId: ['central','asistente'] }
  const [encuentroId, setEncuentroId] = useState(searchParams.get('encuentro') || '');
  const [candidatos, setCandidatos] = useState([]);
  const [arbitroId, setArbitroId] = useState('');
  const [rol, setRol] = useState('central');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEncuentrosConCupo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trae todos los encuentros junto a sus designaciones ya hechas, cruza con
  // las tarifas de cada campeonato para saber qué roles aplican (Central,
  // Asistente, o ambos) y cuáles ya están completos, y deja fuera de la
  // lista los que ya no tienen ningún cupo libre.
  async function cargarEncuentrosConCupo() {
    setCargando(true);
    const { data: todos } = await api.get('/encuentros/general');

    const campeonatoIds = [...new Set(todos.map((e) => e.campeonato_id))];
    const tarifasPorCampeonato = {};
    await Promise.all(
      campeonatoIds.map(async (cid) => {
        const { data } = await api.get(`/tarifas?campeonato_id=${cid}`);
        tarifasPorCampeonato[cid] = data;
      })
    );

    const disponibles = [];
    const rolesMap = {};

    for (const en of todos) {
      const tarifasCategoria = (tarifasPorCampeonato[en.campeonato_id] || []).filter(
        (t) => t.categoria === en.categoria
      );
      const tieneCentral = tarifasCategoria.some((t) => t.rol_arbitro === 'central');
      const tieneAsistente = tarifasCategoria.some((t) => t.rol_arbitro === 'asistente');

      const centralOcupado = en.designados.filter((d) => d.rol === 'central').length;
      const asistentesOcupados = en.designados.filter((d) => d.rol === 'asistente').length;

      const central_completo = !tieneCentral || centralOcupado >= 1;
      const asistente_completo = !tieneAsistente || asistentesOcupados >= 2;

      if (central_completo && asistente_completo) continue; // ya no tiene cupo, se excluye

      const rolesAplicables = [];
      if (tieneCentral && !central_completo) rolesAplicables.push('central');
      if (tieneAsistente && !asistente_completo) rolesAplicables.push('asistente');

      disponibles.push(en);
      rolesMap[en.id] = rolesAplicables;
    }

    setEncuentrosDisponibles(disponibles);
    setRolesPorEncuentro(rolesMap);
    setCargando(false);
  }

  function cargarCandidatos(id) {
    setArbitroId('');
    if (!id) {
      setCandidatos([]);
      return;
    }
    const roles = rolesPorEncuentro[id] || ['central'];
    setRol(roles[0]);
    api.get(`/arbitros/candidatos?encuentro_id=${id}`).then((res) => setCandidatos(res.data));
  }

  useEffect(() => {
    if (encuentroId && Object.keys(rolesPorEncuentro).length > 0) cargarCandidatos(encuentroId);
  }, [rolesPorEncuentro]); // eslint-disable-line react-hooks/exhaustive-deps

  async function designar(e) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    try {
      const { data } = await api.post('/designaciones', {
        encuentro_id: encuentroId,
        arbitro_id: arbitroId,
        rol_designacion: rol,
      });
      setResultado(data);
      cargarEncuentrosConCupo(); // refresca por si este encuentro ya quedó completo
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la designación');
    }
  }

  async function publicar(designacionId) {
    try {
      await api.put(`/designaciones/${designacionId}/publicar`);
      setResultado((prev) => ({ ...prev, designacion: { ...prev.designacion, estado: 'publicada' } }));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al publicar');
    }
  }

  const candidatosOrdenados = [...candidatos].sort((a, b) => Number(b.recomendado) - Number(a.recomendado));
  const rolesDelEncuentro = rolesPorEncuentro[encuentroId] || [];

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-navy-900 mb-1">Designar árbitro</h1>
      <p className="text-sm text-gray-500 mb-5">
        Los árbitros marcados con <IconStarFilled size={12} className="inline text-card-yellow-dark" /> son
        candidatos recomendados según su nivel y disponibilidad. Puedes designar a cualquiera igual.
        Solo se muestran encuentros que todavía tienen algún cupo libre.
      </p>

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : (
        <form onSubmit={designar} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Encuentro</label>
            <select
              required
              value={encuentroId}
              onChange={(e) => { setEncuentroId(e.target.value); cargarCandidatos(e.target.value); }}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="">Selecciona...</option>
              {encuentrosDisponibles.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.fecha?.slice(0, 10)} {en.hora?.slice(0, 5)} — {en.cancha} ({en.categoria})
                </option>
              ))}
            </select>
            {encuentrosDisponibles.length === 0 && (
              <p className="text-[11px] text-gray-500 mt-1">No hay encuentros con cupos libres por designar.</p>
            )}
          </div>

          {encuentroId && (
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Árbitro</label>
              <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {candidatosOrdenados.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition ${
                      arbitroId === String(c.id) ? 'bg-navy-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="arbitro"
                      value={c.id}
                      checked={arbitroId === String(c.id)}
                      onChange={(e) => setArbitroId(e.target.value)}
                      className="accent-navy-700"
                    />
                    {c.recomendado ? (
                      <IconStarFilled size={14} className="text-card-yellow-dark shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span className="flex-1 text-navy-900">{c.nombres} {c.apellidos}</span>
                    <span className="text-xs text-gray-400 capitalize">{c.nivel?.replace('_', ' ')}</span>
                    {!c.disponible && <TarjetaEstado estado="cancelado">No disp.</TarjetaEstado>}
                    {c.penalizacion_activa && <TarjetaEstado estado="cancelado">Penal.</TarjetaEstado>}
                  </label>
                ))}
                {candidatosOrdenados.length === 0 && (
                  <p className="px-3 py-4 text-center text-gray-400 text-xs">No hay árbitros disponibles</p>
                )}
              </div>
            </div>
          )}

          {encuentroId && rolesDelEncuentro.length > 1 && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              >
                {rolesDelEncuentro.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
              </select>
            </div>
          )}
          {encuentroId && rolesDelEncuentro.length === 1 && (
            <p className="text-xs text-gray-500">
              Este encuentro solo necesita <strong>{ETIQUETA_ROL[rolesDelEncuentro[0]]}</strong>.
            </p>
          )}

          {error && (
            <div className="bg-card-red/10 border border-card-red/30 text-card-red-dark text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <button
            disabled={!arbitroId}
            className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition disabled:opacity-50"
          >
            Designar
          </button>
        </form>
      )}

      {resultado && (
        <div className="mt-4 bg-white border border-pitch-green/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-navy-900 font-semibold">Designación creada</p>
            <TarjetaEstado estado={resultado.designacion.estado} />
          </div>
          <p className="text-sm text-gray-600">
            Pago estimado: ${resultado.pago_estimado.monto} + ${resultado.pago_estimado.viatico} viático
            = <strong className="text-navy-900 tabular-nums">${resultado.pago_estimado.total}</strong>
          </p>
          {resultado.designacion.estado !== 'publicada' && (
            <button
              onClick={() => publicar(resultado.designacion.id)}
              className="mt-3 bg-pitch-green hover:bg-pitch-green-dark text-white text-xs px-3 py-2 rounded font-medium transition"
            >
              Publicar designación
            </button>
          )}
        </div>
      )}
    </div>
  );
}
