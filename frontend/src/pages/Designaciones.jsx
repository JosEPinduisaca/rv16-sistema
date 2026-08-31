import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconStarFilled } from '@tabler/icons-react';
import api from '../api/client';
import useCargaActiva from '../hooks/useCargaActiva';
import { nombreCancha } from '../utils/formato';
import TarjetaEstado from '../components/TarjetaEstado';

// Color más intenso mientras mayor es la intensidad del encuentro.
const COLOR_INTENSIDAD = {
  alta: 'bg-card-red/20 border-card-red-dark/40',
  media: 'bg-card-yellow/20 border-card-yellow-dark/40',
  baja: 'bg-pitch-green/15 border-pitch-green-dark/30',
};

export default function Designaciones() {
  const { t } = useTranslation(['designaciones', 'common']);
  const [searchParams] = useSearchParams();
  const [encuentrosDisponibles, setEncuentrosDisponibles] = useState([]); // solo los que aún tienen cupo
  const [slotsPorEncuentro, setSlotsPorEncuentro] = useState({}); // { encuentroId: [{rol, etiqueta}] }
  const [encuentroId, setEncuentroId] = useState('');
  const [candidatos, setCandidatos] = useState([]);
  const [seleccionPorSlot, setSeleccionPorSlot] = useState({}); // { 0: arbitroId, 1: arbitroId, ... }
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [designando, setDesignando] = useState(false);

  // Ventana chiquita para buscar cualquier árbitro por nombre y ver sus designaciones
  const [modalBuscar, setModalBuscar] = useState(false);
  const [todosArbitros, setTodosArbitros] = useState([]);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [arbitroSeleccionado, setArbitroSeleccionado] = useState(null);
  const [designacionesArbitro, setDesignacionesArbitro] = useState([]);
  const [cargandoDesignaciones, setCargandoDesignaciones] = useState(false);
  const cargaActiva = useCargaActiva();

  function abrirBuscador() {
    setModalBuscar(true);
    setTextoBusqueda('');
    setArbitroSeleccionado(null);
    setDesignacionesArbitro([]);
    if (todosArbitros.length === 0) {
      api.get('/arbitros').then((res) => setTodosArbitros(res.data));
    }
  }

  function verDesignacionesDe(arbitro) {
    setArbitroSeleccionado(arbitro);
    setCargandoDesignaciones(true);
    api.get(`/designaciones/arbitro/${arbitro.id}`).then((res) => {
      setDesignacionesArbitro(res.data);
      setCargandoDesignaciones(false);
    });
  }

  const arbitrosFiltrados = todosArbitros.filter((a) =>
    `${a.nombres} ${a.apellidos}`.toLowerCase().includes(textoBusqueda.toLowerCase())
  );

  useEffect(() => {
    cargarEncuentrosConCupo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trae todos los encuentros junto a sus designaciones ya hechas, cruza con
  // las tarifas de cada campeonato para saber qué "cupos" faltan por llenar:
  // Central (1), Asistente 1 y Asistente 2 (hasta 2), y deja fuera de la
  // lista los encuentros que ya no tienen ningún cupo libre.
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
    const slotsMap = {};

    for (const en of todos) {
      const tarifasCategoria = (tarifasPorCampeonato[en.campeonato_id] || []).filter(
        (t) => t.categoria === en.categoria
      );
      const tieneCentral = tarifasCategoria.some((t) => t.rol_arbitro === 'central');
      const tieneAsistente = tarifasCategoria.some((t) => t.rol_arbitro === 'asistente');

      const centralOcupado = en.designados.filter((d) => d.rol === 'central').length;
      const asistentesOcupados = en.designados.filter((d) => d.rol === 'asistente').length;

      const slots = [];

      if (en.modo_designacion === 'dos_centrales') {
        // Dos árbitros como central, sin asistentes.
        if (tieneCentral && centralOcupado === 0) {
          slots.push({ rol: 'central', etiqueta: t('slots.central1') });
          slots.push({ rol: 'central', etiqueta: t('slots.central2') });
        } else if (tieneCentral && centralOcupado === 1) {
          slots.push({ rol: 'central', etiqueta: t('slots.central2') });
        }
      } else if (en.modo_designacion === 'con_asistentes') {
        if (tieneCentral && centralOcupado < 1) slots.push({ rol: 'central', etiqueta: t('slots.central') });
        if (tieneAsistente) {
          if (asistentesOcupados === 0) {
            slots.push({ rol: 'asistente', etiqueta: t('slots.asistente1') });
            slots.push({ rol: 'asistente', etiqueta: t('slots.asistente2') });
          } else if (asistentesOcupados === 1) {
            slots.push({ rol: 'asistente', etiqueta: t('slots.asistente2') });
          }
        }
      } else {
        // Normal: solo central, aunque la categoría tenga tarifa de asistente.
        if (tieneCentral && centralOcupado < 1) slots.push({ rol: 'central', etiqueta: t('slots.central') });
      }

      if (slots.length === 0) continue; // ya no tiene cupo, se excluye

      disponibles.push(en);
      slotsMap[en.id] = slots;
    }

    setEncuentrosDisponibles(disponibles);
    setSlotsPorEncuentro(slotsMap);
    setCargando(false);
  }

  function cargarCandidatos(id) {
    setSeleccionPorSlot({});
    setResultado(null);
    setError(null);
    if (!id) {
      setCandidatos([]);
      return;
    }
    api.get(`/arbitros/candidatos?encuentro_id=${id}`).then((res) => setCandidatos(res.data));
  }

  // Se ejecuta al entrar y también cada vez que cambia el "?encuentro=" en la URL
  // (por ejemplo al hacer clic en "Designar" desde Encuentros estando ya en esta
  // misma pantalla, donde React Router no vuelve a montar el componente).
  useEffect(() => {
    const eid = searchParams.get('encuentro') || '';
    setEncuentroId(eid);
    if (eid) cargarCandidatos(eid);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function designar(e) {
    e.preventDefault();
    setError(null);
    setResultado(null);

    const slots = slotsPorEncuentro[encuentroId] || [];
    const seleccionesHechas = slots
      .map((slot, i) => ({ ...slot, arbitro_id: seleccionPorSlot[i] }))
      .filter((s) => s.arbitro_id)
      .map((s) => {
        const candidato = candidatos.find((c) => String(c.id) === s.arbitro_id);
        return { ...s, nombreArbitro: candidato ? `${candidato.nombres} ${candidato.apellidos}` : '' };
      });

    if (seleccionesHechas.length === 0) {
      setError(t('mensajes.eligeAlMenosUno'));
      return;
    }

    setDesignando(true);
    const creadas = [];
    const errores = [];
    for (const s of seleccionesHechas) {
      try {
        const { data } = await api.post('/designaciones', {
          encuentro_id: encuentroId,
          arbitro_id: s.arbitro_id,
          rol_designacion: s.rol,
        });
        creadas.push({ ...data, etiqueta: s.etiqueta, nombreArbitro: s.nombreArbitro });
      } catch (err) {
        errores.push(`${s.etiqueta}: ${err.response?.data?.error || t('mensajes.errorDesconocido')}`);
      }
    }
    setDesignando(false);
    setResultado({ creadas, errores });
    cargarEncuentrosConCupo();
    setSeleccionPorSlot({});
  }

  async function publicar(designacionId, idx) {
    try {
      await api.put(`/designaciones/${designacionId}/publicar`);
      setResultado((prev) => ({
        ...prev,
        creadas: prev.creadas.map((c, i) => (i === idx ? { ...c, designacion: { ...c.designacion, estado: 'publicada' } } : c)),
      }));
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorPublicar'));
    }
  }

  const slotsDelEncuentro = slotsPorEncuentro[encuentroId] || [];
  const noDisponibles = candidatos.filter((c) => !c.disponible);

  // Un árbitro ya elegido en otro cupo de esta misma tanda no puede repetirse
  function candidatosParaSlot(indiceSlot) {
    const elegidosEnOtrosSlots = Object.entries(seleccionPorSlot)
      .filter(([i]) => Number(i) !== indiceSlot)
      .map(([, v]) => v);
    return [...candidatos]
      .filter((c) => !elegidosEnOtrosSlots.includes(String(c.id)))
      .sort((a, b) => Number(b.recomendado) - Number(a.recomendado));
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h1 className="font-display text-2xl font-semibold text-navy-900">{t('titulo')}</h1>
        <button
          onClick={abrirBuscador}
          disabled={cargaActiva}
          className="text-xs text-navy-600 hover:underline whitespace-nowrap mt-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('verDesignacionesBoton')}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        {t('intro.antesIcono')} <IconStarFilled size={12} className="inline text-card-yellow-dark" /> {t('intro.despuesIcono')}
      </p>

      <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
      {cargando ? (
        <p className="text-sm text-gray-500">{t('common:estado.cargando')}</p>
      ) : (
        <form onSubmit={designar} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('campos.encuentro')}</label>
            <select
              required
              value={encuentroId}
              onChange={(e) => { setEncuentroId(e.target.value); cargarCandidatos(e.target.value); }}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="">{t('campos.selecciona')}</option>
              {encuentrosDisponibles.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.fecha?.slice(0, 10)} {en.hora?.slice(0, 5)} — {nombreCancha(en.cancha)} ({en.categoria})
                </option>
              ))}
            </select>
            {encuentrosDisponibles.length === 0 && (
              <p className="text-[11px] text-gray-500 mt-1">{t('mensajes.sinCupos')}</p>
            )}
          </div>

          {encuentroId && slotsDelEncuentro.length > 0 && (
            <div className="space-y-4">
              {slotsDelEncuentro.length > 1 && (
                <p className="text-xs text-gray-500 bg-navy-50 rounded px-2 py-1.5">
                  {t('mensajes.necesitaVarios', { cantidad: slotsDelEncuentro.length })}
                </p>
              )}
              {slotsDelEncuentro.map((slot, i) => (
                <div key={i}>
                  <label className="block text-xs font-semibold text-navy-700 mb-1.5">{slot.etiqueta}</label>
                  <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-52 overflow-y-auto">
                    {candidatosParaSlot(i).map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition ${
                          seleccionPorSlot[i] === String(c.id) ? 'bg-navy-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`slot-${i}`}
                          value={c.id}
                          checked={seleccionPorSlot[i] === String(c.id)}
                          onChange={(e) => setSeleccionPorSlot((prev) => ({ ...prev, [i]: e.target.value }))}
                          className="accent-navy-700"
                        />
                        {c.recomendado ? (
                          <IconStarFilled size={14} className="text-card-yellow-dark shrink-0" />
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}
                        <span className="flex-1 min-w-0 truncate text-navy-900">{c.nombres} {c.apellidos}</span>
                        <span className="hidden sm:inline text-xs text-gray-400 capitalize shrink-0">{c.nivel?.replace('_', ' ')}</span>
                        {!c.disponible && <TarjetaEstado estado="cancelado">{t('badges.noDisponible')}</TarjetaEstado>}
                        {c.penalizacion_activa && <TarjetaEstado estado="cancelado">{t('badges.penalizacion')}</TarjetaEstado>}
                      </label>
                    ))}
                    {candidatosParaSlot(i).length === 0 && (
                      <p className="px-3 py-4 text-center text-gray-400 text-xs">{t('mensajes.sinArbitrosDisponibles')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>
          )}

          <button
            disabled={designando || cargaActiva || Object.keys(seleccionPorSlot).length === 0}
            className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition disabled:opacity-50"
          >
            {designando ? t('acciones.designando') : t('acciones.designar')}
          </button>
        </form>
      )}

      {resultado && (
        <div className="mt-4 space-y-3">
          {resultado.creadas.map((c, idx) => (
            <div key={c.designacion.id} className="bg-white border border-pitch-green/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-navy-900 font-semibold">{t('resultado.etiquetaDesignado', { nombre: c.nombreArbitro, etiqueta: c.etiqueta })}</p>
                <TarjetaEstado estado={c.designacion.estado} />
              </div>
              <p className="text-sm text-gray-600">
                {t('resultado.pagoEstimado')}{' '}
                <strong className="text-navy-900 tabular-nums">${c.pago_estimado.monto}</strong>
              </p>
              {c.designacion.estado !== 'publicada' && (
                <button
                  onClick={() => publicar(c.designacion.id, idx)}
                  disabled={cargaActiva}
                  className="mt-3 bg-pitch-green hover:bg-pitch-green-dark text-white text-xs px-3 py-2 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('resultado.publicarDesignacion')}
                </button>
              )}
            </div>
          ))}
          {resultado.errores.length > 0 && (
            <div className="bg-card-red/10 border border-card-red/30 text-card-red-dark text-sm px-3 py-2 rounded-md">
              {resultado.errores.join(' · ')}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Panel a la derecha: árbitros candidatos que se marcaron NO disponibles
          para la fecha de este encuentro, con su comentario, para tenerlos en
          cuenta al decidir. Se limpia solo cuando cambias de encuentro y los
          registros vencidos se borran del lado del servidor al pasar la fecha. */}
      <div>
        {encuentroId && noDisponibles.length > 0 && (
          <div className="bg-card-red/5 border border-card-red/30 rounded-lg p-4 sticky top-4">
            <h3 className="text-xs font-bold text-card-red-dark uppercase tracking-wide mb-2">
              {t('panel.noDisponibles', { count: noDisponibles.length })}
            </h3>
            <div className="space-y-2">
              {noDisponibles.map((c) => (
                <div key={c.id} className="bg-white border border-card-red/20 rounded-md px-3 py-2 text-xs">
                  <p className="font-medium text-navy-900">{c.nombres} {c.apellidos}</p>
                  <p className="text-gray-500 mt-0.5">
                    {c.comentario_disponibilidad || t('mensajes.sinComentario')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Ventana chiquita: buscar cualquier árbitro y ver sus designaciones */}
      {modalBuscar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-semibold text-navy-900">{t('modal.titulo')}</h3>
              <button
                onClick={() => setModalBuscar(false)}
                disabled={cargaActiva}
                className="text-gray-400 hover:text-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder={t('modal.placeholderNombre')}
              value={textoBusqueda}
              onChange={(e) => { setTextoBusqueda(e.target.value); setArbitroSeleccionado(null); }}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-navy-600"
            />

            {!arbitroSeleccionado ? (
              <div className="border border-gray-200 rounded-md divide-y divide-gray-100 overflow-y-auto flex-1">
                {arbitrosFiltrados.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => verDesignacionesDe(a)}
                    disabled={cargaActiva}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-navy-50 transition flex items-center gap-2 justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-navy-900 min-w-0 truncate">{a.nombres} {a.apellidos}</span>
                    <span className="text-xs text-gray-400 capitalize shrink-0">{a.nivel?.replace('_', ' ')}</span>
                  </button>
                ))}
                {arbitrosFiltrados.length === 0 && (
                  <p className="px-3 py-4 text-center text-gray-400 text-xs">{t('mensajes.sinResultados')}</p>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <button
                  onClick={() => setArbitroSeleccionado(null)}
                  className="text-xs text-navy-600 hover:underline mb-2"
                >
                  {t('modal.buscarOtro')}
                </button>
                <p className="text-sm font-semibold text-navy-900 mb-2">
                  {arbitroSeleccionado.nombres} {arbitroSeleccionado.apellidos}
                </p>
                {cargandoDesignaciones ? (
                  <p className="text-xs text-gray-500">{t('common:estado.cargando')}</p>
                ) : (
                  <div className="space-y-2">
                    {designacionesArbitro.map((d) => (
                      <Link
                        key={d.id}
                        to={`/designacion-general?fecha=${d.fecha?.slice(0, 10)}&arbitro=${arbitroSeleccionado.id}`}
                        onClick={() => setModalBuscar(false)}
                        className={`block border rounded-md px-3 py-2 text-xs transition hover:brightness-95 ${COLOR_INTENSIDAD[d.intensidad] || 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-navy-900">
                            {d.fecha?.slice(0, 10)} · {d.hora?.slice(0, 5)}
                          </span>
                          <TarjetaEstado estado={d.estado} />
                        </div>
                        <p className="text-gray-500">
                          {nombreCancha(d.cancha)} · {d.categoria} · <span className="capitalize">{d.rol_designacion}</span>
                        </p>
                      </Link>
                    ))}
                    {designacionesArbitro.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">{t('mensajes.sinDesignaciones')}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
