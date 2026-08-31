import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconX, IconChevronDown, IconChevronRight, IconFileDownload } from '@tabler/icons-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import useCargaActiva from '../hooks/useCargaActiva';
import { nombreCancha, hoyISO, mananaISO } from '../utils/formato';
import { exportarDesignacionPdf } from '../utils/exportarDesignacionPdf';
import TarjetaEstado from '../components/TarjetaEstado';

// Formatea "2026-08-29" como "sábado 29 de agosto" (es) o "Saturday, August
// 29" (en), sin depender de la puntuación que trae Intl por defecto.
function formatearFechaLarga(fechaISO, idioma) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fechaObj = new Date(anio, mes - 1, dia);
  const locale = idioma === 'en' ? 'en-US' : 'es-ES';
  const partes = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).formatToParts(fechaObj);
  const parte = (tipo) => partes.find((p) => p.type === tipo)?.value || '';
  return idioma === 'en'
    ? `${parte('weekday')}, ${parte('month')} ${parte('day')}`
    : `${parte('weekday')} ${parte('day')} de ${parte('month')}`;
}

function capitalizar(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

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
  const { t, i18n } = useTranslation(['designacionGeneral', 'common']);
  const { usuario } = useAuth();
  const puedeGestionar = usuario?.rol === 'administrador' || usuario?.rol === 'directivo';
  const [searchParams] = useSearchParams();
  const [fecha, setFecha] = useState('');
  const [encuentros, setEncuentros] = useState([]);
  const [arbitros, setArbitros] = useState([]);
  const [arbitroPropioId, setArbitroPropioId] = useState(null);
  const [arbitroResaltado, setArbitroResaltado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [expandidos, setExpandidos] = useState({}); // { nombreCampeonato: true/false }
  const [confirmarQuitar, setConfirmarQuitar] = useState(null); // designacionId
  const [error, setError] = useState(null);
  const cargaActiva = useCargaActiva();

  function cargar(f) {
    setCargando(true);
    const url = f ? `/encuentros/general?fecha=${f}` : '/encuentros/general';
    api.get(url).then((res) => {
      setEncuentros(res.data);
      setCargando(false);
    });
  }

  useEffect(() => {
    if (puedeGestionar) {
      api.get('/arbitros').then((res) => setArbitros(res.data));
    } else {
      // Para resaltar automáticamente sus propias designaciones, sin
      // depender de un "?arbitro=" en la URL (eso solo lo genera admin/directivo).
      api.get('/arbitros/me').then((res) => setArbitroPropioId(String(res.data.id)));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Una vez se conoce el propio id de árbitro, se resalta automáticamente
  // (salvo que ya se haya llegado con un "?arbitro=" explícito en la URL).
  useEffect(() => {
    if (!puedeGestionar && arbitroPropioId && !searchParams.get('arbitro')) {
      setArbitroResaltado(arbitroPropioId);
    }
  }, [puedeGestionar, arbitroPropioId, searchParams]);

  // Los árbitros no pueden refrescar manualmente ni recibir cambios en vivo
  // de otra forma, así que para ellos se refresca solo (en silencio, sin
  // bloquear la pantalla) cada 5 segundos.
  useEffect(() => {
    if (puedeGestionar) return;
    const intervalo = setInterval(() => {
      const url = fecha ? `/encuentros/general?fecha=${fecha}` : '/encuentros/general';
      api.get(url, { silencioso: true }).then((res) => setEncuentros(res.data));
    }, 5000);
    return () => clearInterval(intervalo);
  }, [puedeGestionar, fecha]);

  // Se ejecuta al entrar y también cada vez que cambian "?fecha=" o "?arbitro="
  // en la URL (por ejemplo al llegar desde "Ver designaciones de un árbitro"),
  // incluso si el componente ya estaba montado en esta misma ruta.
  useEffect(() => {
    const f = searchParams.get('fecha') || (puedeGestionar ? '' : hoyISO());
    const a = searchParams.get('arbitro') || '';
    setFecha(f);
    setArbitroResaltado(a);
    cargar(f);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al llegar con "?arbitro=" en la URL, abre automáticamente el/los
  // campeonato(s) donde ese árbitro tiene una designación, para no obligar
  // a expandir todo a mano para ver el resaltado.
  useEffect(() => {
    const a = searchParams.get('arbitro');
    if (!a || encuentros.length === 0) return;
    const gruposConArbitro = new Set(
      encuentros
        .filter((e) => e.designados.some((d) => String(d.arbitro_id) === String(a)))
        .map((e) => e.campeonato_nombre)
    );
    if (gruposConArbitro.size > 0) {
      setExpandidos((prev) => {
        const nuevo = { ...prev };
        gruposConArbitro.forEach((g) => { nuevo[g] = true; });
        return nuevo;
      });
    }
  }, [encuentros, searchParams]);

  function alternarExpandido(torneo) {
    setExpandidos((prev) => ({ ...prev, [torneo]: !prev[torneo] }));
  }

  async function confirmarQuitarDesignacion() {
    setError(null);
    try {
      await api.delete(`/designaciones/${confirmarQuitar}`);
      setConfirmarQuitar(null);
      cargar(fecha);
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorQuitar'));
      setConfirmarQuitar(null);
    }
  }

  // Los árbitros solo ven los encuentros ya publicados; admin/directivo ven todo.
  const encuentrosVisibles = puedeGestionar ? encuentros : encuentros.filter((e) => e.estado === 'publicado');

  const grupos = encuentrosVisibles.reduce((acc, e) => {
    const clave = e.campeonato_nombre;
    if (!acc[clave]) acc[clave] = [];
    acc[clave].push(e);
    return acc;
  }, {});

  // Si hay un árbitro resaltado, solo se muestran los campeonatos donde
  // tiene alguna designación (además de resaltar su fila dentro de ellos).
  const nombresGrupos = arbitroResaltado
    ? Object.keys(grupos).filter((torneo) =>
        grupos[torneo].some((p) => p.designados.some((d) => String(d.arbitro_id) === String(arbitroResaltado)))
      )
    : Object.keys(grupos);
  // Se reparten en 2 columnas: los de índice par van a la izquierda, los impares a la derecha
  const columnaIzquierda = nombresGrupos.filter((_, i) => i % 2 === 0);
  const columnaDerecha = nombresGrupos.filter((_, i) => i % 2 === 1);

  // Filas de partidos de un campeonato; se reutiliza tanto en el panel
  // interactivo (colapsable) como en la vista imprimible (siempre expandida).
  function FilasDelTorneo({ torneo, permitirAcciones }) {
    return (
      <div className="divide-y divide-gray-100">
        {grupos[torneo].map((p) => {
          const tieneResaltado = arbitroResaltado && p.designados.some(
            (d) => String(d.arbitro_id) === String(arbitroResaltado)
          );
          const sinDesignar = p.designados.length === 0;
          let claseFila = sinDesignar ? 'bg-card-red/15' : 'bg-pitch-green/15';
          if (tieneResaltado) {
            claseFila = 'bg-card-yellow/35 ring-1 ring-inset ring-card-yellow-dark/50';
          }
          return (
            <div key={p.id} className={`px-3 py-2.5 text-xs flex items-start gap-3 ${claseFila}`}>
              <span className="tabular-nums font-semibold text-navy-900 whitespace-nowrap pt-0.5">
                {p.hora?.slice(0, 5)}
              </span>
              <span className="text-gray-500 truncate max-w-[90px] sm:max-w-[160px] pt-0.5">{nombreCancha(p.cancha)}</span>
              <div className="flex-1 min-w-0">
                {p.designados.length === 0 ? (
                  <span className="text-gray-300 italic">{t('panel.sinDesignarLabel')}</span>
                ) : (
                  <div className="flex flex-col gap-1">
                    {p.designados.map((d, idx) => {
                      const esResaltado = arbitroResaltado && String(d.arbitro_id) === String(arbitroResaltado);
                      return (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className={esResaltado ? 'font-semibold text-navy-900' : 'text-navy-800'}>
                            {d.nombre} <span className="text-gray-400">· {d.rol}</span>
                          </span>
                          {permitirAcciones && puedeGestionar && (
                            <button
                              onClick={() => setConfirmarQuitar(d.designacion_id)}
                              disabled={cargaActiva}
                              title={t('acciones.quitarDesignacionTitulo')}
                              className="text-gray-300 hover:text-card-red transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              {puedeGestionar && <TarjetaEstado estado={p.estado} />}
              {permitirAcciones && puedeGestionar && sinDesignar && (
                <Link
                  to={`/designaciones?encuentro=${p.id}`}
                  className="text-navy-600 hover:text-navy-900 hover:underline text-xs font-medium whitespace-nowrap pt-0.5"
                >
                  {t('acciones.designar')}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function PanelCampeonato({ torneo, i }) {
    const colorClase = PALETA[i % PALETA.length];
    const abierto = !!expandidos[torneo];
    const sinDesignarCount = grupos[torneo].filter((p) => p.designados.length === 0).length;

    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        <button
          onClick={() => alternarExpandido(torneo)}
          className={`${colorClase} text-white w-full px-3 py-2.5 flex items-center justify-between text-left`}
        >
          <span className="font-display text-sm font-semibold tracking-wide flex items-center gap-2 min-w-0">
            {abierto ? <IconChevronDown size={16} className="shrink-0" /> : <IconChevronRight size={16} className="shrink-0" />}
            <span className="truncate">{torneo}</span>
          </span>
          {puedeGestionar && (
            <span className="text-[11px] opacity-90 whitespace-nowrap ml-2">
              {t('panel.partidos', { count: grupos[torneo].length })}
              {sinDesignarCount > 0 && <> · {t('panel.sinDesignarSufijo', { count: sinDesignarCount })}</>}
            </span>
          )}
        </button>

        {abierto && <FilasDelTorneo torneo={torneo} permitirAcciones />}
      </div>
    );
  }

  async function exportarPdf() {
    const tituloDoc = fecha
      ? t('impresion.tituloConFecha', { fecha: formatearFechaLarga(fecha, i18n.resolvedLanguage) })
      : t('impresion.tituloSinFecha');
    await exportarDesignacionPdf({
      nombresGrupos,
      grupos,
      tituloDoc,
      nombreArchivo: `designacion${fecha ? `-${fecha}` : ''}.pdf`,
      arbitroResaltado,
      textoSinDesignar: t('panel.sinDesignarLabel'),
    });
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">{t('titulo')}</h1>
          {puedeGestionar && fecha ? (
            <p className="font-display text-lg font-semibold text-navy-700 mt-1">
              {capitalizar(formatearFechaLarga(fecha, i18n.resolvedLanguage))}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">{t('subtitulo')}</p>
          )}
          {puedeGestionar && (
            <p className="text-xs text-gray-500 mt-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-card-red/25 align-middle mr-1" />
              {t('leyenda.sinDesignar')}
              <span className="inline-block w-3 h-3 rounded-sm bg-pitch-green/25 align-middle ml-4 mr-1" />
              {t('leyenda.yaDesignado')}
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          {puedeGestionar && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('filtros.resaltarArbitro')}</label>
              <select
                value={arbitroResaltado}
                onChange={(e) => setArbitroResaltado(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              >
                <option value="">{t('filtros.ninguno')}</option>
                {arbitros.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombres} {a.apellidos}</option>
                ))}
              </select>
            </div>
          )}
          {!puedeGestionar && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('filtros.designacion')}</label>
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => { const f = hoyISO(); setFecha(f); cargar(f); }}
                  className={`px-3 py-1.5 font-medium transition ${
                    fecha === hoyISO() ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('filtros.hoy')}
                </button>
                <button
                  type="button"
                  onClick={() => { const f = mananaISO(); setFecha(f); cargar(f); }}
                  className={`px-3 py-1.5 font-medium transition ${
                    fecha === mananaISO() ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('filtros.manana')}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('filtros.filtrarPorFecha')}</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); cargar(e.target.value); }}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          {nombresGrupos.length > 0 && (
            <button
              onClick={() => {
                const todosAbiertos = nombresGrupos.every((t) => expandidos[t]);
                const nuevo = {};
                nombresGrupos.forEach((t) => { nuevo[t] = !todosAbiertos; });
                setExpandidos(nuevo);
              }}
              className="text-xs text-navy-600 hover:underline mb-1.5"
            >
              {nombresGrupos.every((tor) => expandidos[tor]) ? t('acciones.colapsarTodos') : t('acciones.expandirTodos')}
            </button>
          )}
          {nombresGrupos.length > 0 && usuario?.rol === 'administrador' && (
            <button
              onClick={exportarPdf}
              className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded text-sm font-medium transition mb-0.5"
            >
              <IconFileDownload size={16} />
              {t('acciones.exportarPdf')}
            </button>
          )}
        </div>
      </div>

      {cargando && <p className="text-sm text-gray-500">{t('common:estado.cargando')}</p>}

      {!cargando && nombresGrupos.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-8 text-center text-gray-400 text-sm">
          {arbitroResaltado
            ? t('mensajes.vacioArbitro')
            : fecha ? t('mensajes.vacioConFecha') : t('mensajes.vacioSinFecha')}
        </div>
      )}

      <div className="grid gap-0 lg:grid-cols-2 lg:gap-x-5">
        <div>
          {columnaIzquierda.map((torneo) => (
            <PanelCampeonato key={torneo} torneo={torneo} i={nombresGrupos.indexOf(torneo)} />
          ))}
        </div>
        <div>
          {columnaDerecha.map((torneo) => (
            <PanelCampeonato key={torneo} torneo={torneo} i={nombresGrupos.indexOf(torneo)} />
          ))}
        </div>
      </div>

      {error && (
        <p className="fixed bottom-4 right-4 bg-card-red text-white text-sm px-4 py-2 rounded shadow-lg">{error}</p>
      )}

      {confirmarQuitar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-2">{t('modal.confirmarQuitarTitulo')}</h3>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmarQuitar(null)}
                disabled={cargaActiva}
                className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common:acciones.cancelar')}
              </button>
              <button
                onClick={confirmarQuitarDesignacion}
                disabled={cargaActiva}
                className="px-3 py-1.5 rounded text-sm font-medium text-white bg-card-red hover:bg-card-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('acciones.quitar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
