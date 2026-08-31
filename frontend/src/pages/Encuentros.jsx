import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import api from '../api/client';
import useCargaActiva from '../hooks/useCargaActiva';
import usePaginacion from '../hooks/usePaginacion';
import { textoValido } from '../utils/validaciones';
import { nombreCancha } from '../utils/formato';
import TarjetaEstado from '../components/TarjetaEstado';
import Paginador from '../components/Paginador';

const INTENSIDADES = ['alta', 'media', 'baja'];
const MODOS_ENCUENTRO = [
  { v: 'normal', l: 'modos.normal' },
  { v: 'con_asistentes', l: 'modos.conAsistentes' },
  { v: 'dos_centrales', l: 'modos.dosCentrales' },
];
const hoyISO = () => new Date().toISOString().slice(0, 10);
const horaActualHHMM = () => {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
};

const FORM_VACIO = {
  campeonato_id: '', categoria: '', intensidad: INTENSIDADES[0], fecha: '', hora: '',
  mas_de_una_cancha: 'no', cantidad_canchas: '2', tipo_numeracion: 'numeros',
  modo_designacion: 'normal',
};
const FILTROS_ESTADO = [
  { value: '', label: 'filtros.todos' },
  { value: 'programado', label: 'filtros.programar' },
  { value: 'designado', label: 'filtros.designados' },
  { value: 'publicado', label: 'filtros.publicados' },
];

export default function Encuentros() {
  const { t } = useTranslation(['encuentros', 'common']);
  const [encuentros, setEncuentros] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [campeonatos, setCampeonatos] = useState([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [tarifasCampeonato, setTarifasCampeonato] = useState([]);
  const [ultimoEncuentroId, setUltimoEncuentroId] = useState(null);
  const [modalIngresar, setModalIngresar] = useState(false);
  const [pasoIngresar, setPasoIngresar] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('fecha'); // 'fecha' | 'hora'
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [erroresForm, setErroresForm] = useState({});

  const [modalEditar, setModalEditar] = useState(null);
  const [errorEditar, setErrorEditar] = useState(null);
  const [erroresEditar, setErroresEditar] = useState({});
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // { id, etiqueta }
  const [errorEliminar, setErrorEliminar] = useState(null);
  const cargaActiva = useCargaActiva();

  const encuentrosFiltrados = encuentros
    .filter((en) => {
      const q = busqueda.toLowerCase();
      return !q || nombreCampeonato(en.campeonato_id).toLowerCase().includes(q);
    })
    .sort((a, b) => (
      orden === 'hora'
        ? (a.hora || '').localeCompare(b.hora || '')
        : (a.fecha || '').localeCompare(b.fecha || '')
    ));
  const { pagina, setPagina, totalPaginas, paginaActual: encuentrosPagina } = usePaginacion(encuentrosFiltrados);

  function cargar(estado = filtroEstado) {
    const url = estado ? `/encuentros?estado=${estado}` : '/encuentros';
    api.get(url).then((res) => setEncuentros(res.data));
  }

  function cambiarFiltro(estado) {
    setFiltroEstado(estado);
    setPagina(1);
    cargar(estado);
  }

  function cambiarBusqueda(valor) {
    setBusqueda(valor);
    setPagina(1);
  }

  function cambiarOrden(nuevoOrden) {
    setOrden(nuevoOrden);
    setPagina(1);
  }

  useEffect(() => {
    cargar();
    api.get('/campeonatos').then((res) => setCampeonatos(res.data));
  }, []);

  async function alSeleccionarCampeonato(campeonatoId, destino = 'form') {
    if (destino === 'form') {
      setForm((prev) => ({
        ...prev,
        campeonato_id: campeonatoId,
        categoria: '',
        modo_designacion: prev.modo_designacion === 'con_asistentes' ? 'normal' : prev.modo_designacion,
      }));
    } else {
      setModalEditar((prev) => ({ ...prev, campeonato_id: campeonatoId, categoria: '' }));
    }

    if (!campeonatoId) {
      setCategoriasDisponibles([]);
      setTarifasCampeonato([]);
      return;
    }
    const { data: tarifas } = await api.get(`/tarifas?campeonato_id=${campeonatoId}`);
    setCategoriasDisponibles([...new Set(tarifas.map((t) => t.categoria))]);
    setTarifasCampeonato(tarifas);
  }

  // ¿Esta categoría del campeonato ya tiene tarifa de Asistente configurada?
  function tieneTarifaAsistente(categoria) {
    return tarifasCampeonato.some((t) => t.categoria === categoria && t.rol_arbitro === 'asistente');
  }

  function nombreCampeonato(id) {
    return campeonatos.find((c) => String(c.id) === String(id))?.nombre || '';
  }

  function campeonatoPorId(id) {
    return campeonatos.find((c) => String(c.id) === String(id)) || null;
  }

  // Rango de fechas permitido para un encuentro nuevo: no antes de hoy ni
  // antes de que arranque el campeonato, y no después de que termine.
  function rangoFechaIngresar(campeonatoId) {
    const campeonato = campeonatoPorId(campeonatoId);
    const inicioCampeonato = campeonato?.fecha_inicio?.slice(0, 10);
    const finCampeonato = campeonato?.fecha_fin?.slice(0, 10);
    const min = inicioCampeonato && inicioCampeonato > hoyISO() ? inicioCampeonato : hoyISO();
    return { min, max: finCampeonato || undefined };
  }

  function abrirIngresar() {
    setForm(FORM_VACIO);
    setErroresForm({});
    setError(null);
    setMensaje(null);
    setUltimoEncuentroId(null);
    setCategoriasDisponibles([]);
    setTarifasCampeonato([]);
    setPasoIngresar(1);
    setModalIngresar(true);
  }

  function cerrarModalIngresar() {
    setModalIngresar(false);
    setPasoIngresar(1);
    setForm(FORM_VACIO);
    setErroresForm({});
    setError(null);
    setCategoriasDisponibles([]);
    setTarifasCampeonato([]);
  }

  // Si el encuentro es hoy, la hora tampoco puede ya haber pasado (la fecha
  // en sí no puede ser pasada gracias al min={hoyISO()} del input nativo).
  function validarHora(fecha, hora) {
    if (hora === '00:00') return t('mensajes.horaInvalida');
    if (fecha === hoyISO() && hora <= horaActualHHMM()) return t('mensajes.horaPasada');
    return null;
  }

  // La fecha del encuentro debe caer dentro de la duración del campeonato
  // elegido (y no antes de hoy).
  function validarFechaIngresar(campeonatoId, fecha) {
    if (!fecha) return null;
    const { min, max } = rangoFechaIngresar(campeonatoId);
    if (min && fecha < min) return t('mensajes.fechaFueraDeRango');
    if (max && fecha > max) return t('mensajes.fechaFueraDeRango');
    return null;
  }

  function alPerderFocoHora() {
    setErroresForm((prev) => ({ ...prev, hora: validarHora(form.fecha, form.hora) }));
  }

  function alPerderFocoFecha() {
    setErroresForm((prev) => ({ ...prev, fecha: validarFechaIngresar(form.campeonato_id, form.fecha) }));
  }

  function alPerderFocoEditar(campo) {
    if (campo === 'hora') {
      // Aquí solo se valida "00:00": al editar (a diferencia de ingresar) se
      // permite mantener o corregir un encuentro que ya es del pasado.
      setErroresEditar((prev) => ({ ...prev, hora: modalEditar.hora === '00:00' ? t('mensajes.horaInvalida') : null }));
    } else if (campo === 'cancha') {
      setErroresEditar((prev) => ({ ...prev, cancha: textoValido(modalEditar.cancha) ? null : t('validacion.canchaInvalida') }));
    }
  }

  async function ingresar(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    const errorFecha = validarFechaIngresar(form.campeonato_id, form.fecha);
    if (errorFecha) {
      setError(errorFecha);
      return;
    }

    const errorHora = validarHora(form.fecha, form.hora);
    if (errorHora) {
      setError(errorHora);
      return;
    }

    const cantidad = form.mas_de_una_cancha === 'si' ? (Number(form.cantidad_canchas) || 2) : 1;
    const nombreBase = nombreCampeonato(form.campeonato_id);

    function etiquetaCancha(i) {
      if (cantidad === 1) return nombreBase;
      const sufijo = form.tipo_numeracion === 'letras' ? String.fromCharCode(64 + i) : i;
      return `${nombreBase} ${sufijo}`;
    }

    try {
      let creados = 0;
      let idCreado = null;
      const categoriaCreada = form.categoria;
      for (let i = 1; i <= cantidad; i++) {
        const cancha = etiquetaCancha(i);
        const { data } = await api.post('/encuentros', {
          campeonato_id: form.campeonato_id,
          categoria: form.categoria,
          intensidad: form.intensidad,
          fecha: form.fecha,
          hora: form.hora,
          cancha,
          modo_designacion: form.modo_designacion,
        });
        idCreado = data.id;
        creados++;
      }
      setMensaje(
        creados === 1
          ? t('mensajes.ingresadoUno')
          : t('mensajes.ingresadosVarios', { creados })
      );
      // Solo tiene sentido ofrecer el atajo de "Añadir asistentes" cuando se
      // creó un único encuentro (con varias canchas no sabríamos a cuál ir)
      // y cuando esa categoría ya tiene tarifa de Asistente configurada.
      setUltimoEncuentroId(
        creados === 1 && (tieneTarifaAsistente(categoriaCreada) || form.modo_designacion === 'dos_centrales')
          ? idCreado
          : null
      );
      // El campeonato queda fijo: se puede seguir ingresando encuentros para
      // el mismo campeonato sin volver a elegirlo (útil para cargar varios
      // partidos de una jornada uno detrás de otro).
      setForm((prev) => ({ ...FORM_VACIO, campeonato_id: prev.campeonato_id }));
      setErroresForm({});
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorIngresar'));
    }
  }

  async function abrirEditar(en) {
    setErrorEditar(null);
    setErroresEditar({});
    setModalEditar({
      id: en.id,
      campeonato_id: en.campeonato_id,
      categoria: en.categoria,
      intensidad: en.intensidad,
      fecha: en.fecha?.slice(0, 10),
      hora: en.hora?.slice(0, 5),
      cancha: nombreCancha(en.cancha),
    });
    await alSeleccionarCampeonato(en.campeonato_id, 'modal');
    setCategoriasDisponibles((prev) => (prev.includes(en.categoria) ? prev : [...prev, en.categoria]));
    setModalEditar((prev) => ({ ...prev, categoria: en.categoria, cancha: nombreCancha(en.cancha) }));
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setErrorEditar(null);

    if (modalEditar.hora === '00:00') {
      setErrorEditar(t('mensajes.horaInvalida'));
      return;
    }

    try {
      await api.put(`/encuentros/${modalEditar.id}`, {
        categoria: modalEditar.categoria,
        intensidad: modalEditar.intensidad,
        fecha: modalEditar.fecha,
        hora: modalEditar.hora,
        cancha: modalEditar.cancha,
      });
      setModalEditar(null);
      setErroresEditar({});
      cargar();
    } catch (err) {
      setErrorEditar(err.response?.data?.error || t('mensajes.errorActualizar'));
    }
  }

  async function confirmarEliminarEncuentro() {
    setErrorEliminar(null);
    try {
      await api.delete(`/encuentros/${confirmarEliminar.id}`);
      setConfirmarEliminar(null);
      cargar();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || t('mensajes.errorEliminar'));
    }
  }

  // "Con asistentes" solo se ofrece si la categoría elegida ya tiene tarifa
  // de Asistente configurada para ese campeonato.
  const modosDisponibles = form.categoria && tieneTarifaAsistente(form.categoria)
    ? MODOS_ENCUENTRO
    : MODOS_ENCUENTRO.filter((m) => m.v !== 'con_asistentes');

  function alElegirCategoria(nuevaCategoria) {
    setForm((prev) => ({
      ...prev,
      categoria: nuevaCategoria,
      modo_designacion:
        prev.modo_designacion === 'con_asistentes' && !tieneTarifaAsistente(nuevaCategoria)
          ? 'normal'
          : prev.modo_designacion,
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h1 className="font-display text-2xl font-semibold text-navy-900">{t('titulo')}</h1>
        <button
          onClick={abrirIngresar}
          disabled={cargaActiva}
          className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconPlus size={16} />
          {t('form.titulo')}
        </button>
      </div>

      {mensaje && (
        <div className="bg-pitch-green/10 rounded px-3 py-2 mb-4 space-y-2">
          <p className="text-xs text-pitch-green-dark">{mensaje}</p>
          {ultimoEncuentroId && (
            <Link
              to={`/designaciones?encuentro=${ultimoEncuentroId}`}
              className="inline-block bg-navy-900 hover:bg-navy-800 text-white text-xs px-3 py-1.5 rounded font-medium transition"
            >
              {t('form.designarAhora')}
            </Link>
          )}
        </div>
      )}

      <div>
        <div className="flex items-end flex-wrap gap-3 mb-3">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
            {FILTROS_ESTADO.map((f) => (
              <button
                key={f.value}
                onClick={() => cambiarFiltro(f.value)}
                disabled={cargaActiva}
                className={`px-3 py-1.5 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  filtroEstado === f.value ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t(f.label)}
              </button>
            ))}
          </div>
          <div className="max-w-xs">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              placeholder={t('buscar.placeholder')}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('ordenar.etiqueta')}:</span>
            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
              {['fecha', 'hora'].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => cambiarOrden(op)}
                  className={`px-3 py-1.5 font-medium transition ${
                    orden === op ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t(`ordenar.${op}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.fecha')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.hora')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.campeonato')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.categoria')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.estado')}</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {encuentrosPagina.map((en) => (
                <tr key={en.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                  <td className="px-4 py-2.5">{en.fecha?.slice(0, 10)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{en.hora}</td>
                  <td className="px-4 py-2.5">{nombreCampeonato(en.campeonato_id)}</td>
                  <td className="px-4 py-2.5 capitalize">{en.categoria}</td>
                  <td className="px-4 py-2.5"><TarjetaEstado estado={en.estado} /></td>
                  <td className="px-4 py-2.5">
                    {en.estado !== 'designado' && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => abrirEditar(en)}
                          disabled={cargaActiva}
                          title={t('common:acciones.editar')}
                          className="text-navy-600 hover:text-navy-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <IconEdit size={16} />
                        </button>
                        {en.estado === 'publicado' ? (
                          <Link to={`/designacion-general?fecha=${en.fecha?.slice(0, 10)}`} className="text-navy-600 hover:text-navy-900 hover:underline text-xs font-medium">
                            {t('verDesignado')}
                          </Link>
                        ) : (
                          <Link to={`/designaciones?encuentro=${en.id}`} className="text-navy-600 hover:text-navy-900 hover:underline text-xs font-medium">
                            {t('designar')}
                          </Link>
                        )}
                        <button
                          onClick={() => { setErrorEliminar(null); setConfirmarEliminar({ id: en.id, etiqueta: `${nombreCancha(en.cancha)} · ${en.fecha?.slice(0, 10)} ${en.hora?.slice(0, 5)}` }); }}
                          disabled={cargaActiva}
                          title={t('common:acciones.eliminar')}
                          className="text-gray-400 hover:text-card-red disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {encuentrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    {busqueda ? t('vacioBusqueda') : t('vacio')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      {/* Modal: ingresar encuentro */}
      {modalIngresar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-navy-900">{t('form.titulo')}</h3>
              <button
                type="button"
                onClick={cerrarModalIngresar}
                disabled={cargaActiva}
                className="text-gray-400 hover:text-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            </div>
        <form onSubmit={ingresar} className="space-y-3">
          {/* Paso 1: elegir campeonato y categoría */}
          {pasoIngresar === 1 && (
          <>
          {!form.campeonato_id && (
            <div className="bg-card-yellow/20 border border-card-yellow-dark/40 text-card-yellow-dark text-sm font-semibold rounded-md px-3 py-2 text-center">
              {t('form.primeroCampeonato')}
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('form.campeonato')}</label>
            <select
              required
              value={form.campeonato_id}
              onChange={(e) => alSeleccionarCampeonato(e.target.value, 'form')}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="">{t('form.selecciona')}</option>
              {campeonatos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Categoría: se muestra desde el inicio (misma pantalla que
              Campeonato), pero deshabilitada hasta elegir un campeonato */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('form.categoria')}</label>
            <select
              required
              disabled={!form.campeonato_id}
              value={form.categoria}
              onChange={(e) => alElegirCategoria(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="">{t('form.selecciona')}</option>
              {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {form.campeonato_id && categoriasDisponibles.length === 0 && (
              <p className="text-[11px] text-card-red-dark mt-1">{t('form.sinTarifas')}</p>
            )}
            {form.categoria && tieneTarifaAsistente(form.categoria) && (
              <p className="text-[11px] text-pitch-green-dark mt-1">
                {t('form.admiteAsistentes')}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cerrarModalIngresar}
              disabled={cargaActiva}
              className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common:acciones.cancelar')}
            </button>
            <button
              type="button"
              onClick={() => setPasoIngresar(2)}
              disabled={!form.categoria}
              className="flex-1 bg-navy-900 hover:bg-navy-800 text-white py-1.5 rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('form.siguiente')}
            </button>
          </div>
          </>
          )}

          {/* Paso 2: el campeonato queda fijo (bloqueado); el resto se puede
              elegir y volver a elegir para cargar varios encuentros seguidos */}
          {pasoIngresar === 2 && (
          <>
          {mensaje && (
            <div className="bg-pitch-green/10 rounded px-2 py-1.5 space-y-2">
              <p className="text-xs text-pitch-green-dark">{mensaje}</p>
              {ultimoEncuentroId && (
                <Link
                  to={`/designaciones?encuentro=${ultimoEncuentroId}`}
                  className="inline-block bg-navy-900 hover:bg-navy-800 text-white text-xs px-3 py-1.5 rounded font-medium transition"
                >
                  {t('form.designarAhora')}
                </Link>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('form.campeonato')}</label>
            <input
              disabled
              value={nombreCampeonato(form.campeonato_id)}
              className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('form.categoria')}</label>
            <select
              required
              value={form.categoria}
              onChange={(e) => alElegirCategoria(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="">{t('form.selecciona')}</option>
              {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {form.categoria && tieneTarifaAsistente(form.categoria) && (
              <p className="text-[11px] text-pitch-green-dark mt-1">
                {t('form.admiteAsistentes')}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('form.intensidad')}</label>
            <select
              value={form.intensidad}
              onChange={(e) => setForm({ ...form, intensidad: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              {INTENSIDADES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {/* Fecha y hora juntos en una sola línea */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('form.fecha')}</label>
              <input
                type="date" required
                min={rangoFechaIngresar(form.campeonato_id).min}
                max={rangoFechaIngresar(form.campeonato_id).max}
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                onBlur={alPerderFocoFecha}
                className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresForm.fecha ? 'border-card-red' : 'border-gray-300'}`}
              />
              {erroresForm.fecha && <p className="text-[11px] text-card-red-dark mt-1">{erroresForm.fecha}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('form.hora')}</label>
              <input
                type="time" required
                min={form.fecha === hoyISO() ? horaActualHHMM() : undefined}
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                onBlur={alPerderFocoHora}
                className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresForm.hora ? 'border-card-red' : 'border-gray-300'}`}
              />
              {erroresForm.hora && <p className="text-[11px] text-card-red-dark mt-1">{erroresForm.hora}</p>}
            </div>
          </div>

          {/* Modo del encuentro: "Con asistentes" solo aparece si la categoría
              elegida ya tiene tarifa de Asistente configurada */}
          <div className="bg-navy-50 border border-navy-100 rounded-md p-3">
            <label className="block text-xs font-bold text-navy-900 mb-2 tracking-wide">
              {t('form.esteEncuentroEs')}
            </label>
            <div className={`grid gap-1.5 ${modosDisponibles.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {modosDisponibles.map((op) => (
                <button
                  key={op.v}
                  type="button"
                  onClick={() => setForm({ ...form, modo_designacion: op.v })}
                  className={`text-xs font-semibold px-2 py-2 rounded-md border transition ${
                    form.modo_designacion === op.v
                      ? 'bg-navy-900 text-white border-navy-900'
                      : 'bg-white text-navy-700 border-navy-200 hover:border-navy-400'
                  }`}
                >
                  {t(op.l)}
                </button>
              ))}
            </div>
          </div>

          {/* ¿Más de una cancha en este horario? Sí/No */}
          <div className="bg-card-yellow/15 border border-card-yellow-dark/30 rounded-md p-3">
            <label className="block text-xs font-semibold text-card-yellow-dark mb-1.5">
              {t('form.masDeUnaCancha')}
            </label>
            <div className="inline-flex rounded-md border border-card-yellow-dark/40 overflow-hidden text-xs">
              {[{ v: 'no', l: t('form.no') }, { v: 'si', l: t('form.si') }].map((op) => (
                <button
                  key={op.v}
                  type="button"
                  onClick={() => setForm({ ...form, mas_de_una_cancha: op.v })}
                  className={`px-4 py-1.5 font-medium transition ${
                    form.mas_de_una_cancha === op.v ? 'bg-card-yellow-dark text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {op.l}
                </button>
              ))}
            </div>

            {form.mas_de_una_cancha === 'si' && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('form.cuantasCanchas')}</label>
                  <input
                    type="number" min="2" max="20" step="1" required
                    value={form.cantidad_canchas}
                    onChange={(e) => setForm({ ...form, cantidad_canchas: e.target.value })}
                    className="w-full border border-card-yellow-dark/40 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-card-yellow-dark"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('form.numerarCon')}</label>
                  <select
                    value={form.tipo_numeracion}
                    onChange={(e) => setForm({ ...form, tipo_numeracion: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                  >
                    <option value="numeros">{t('form.numeros')}</option>
                    <option value="letras">{t('form.letras')}</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-600">
                  {t('form.seCrearan', { cantidad: form.cantidad_canchas })}
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPasoIngresar(1)}
              disabled={cargaActiva}
              className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('form.atras')}
            </button>
            <button
              disabled={cargaActiva}
              className="flex-1 bg-navy-900 hover:bg-navy-800 text-white py-1.5 rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('form.ingresar')}
            </button>
          </div>
          </>
          )}
        </form>
          </div>
        </div>
      )}

      {/* Modal: editar encuentro */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-4">{t('modal.editarTitulo')}</h3>
            <form onSubmit={guardarEdicion} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('form.categoria')}</label>
                <select
                  required
                  value={modalEditar.categoria}
                  onChange={(e) => setModalEditar({ ...modalEditar, categoria: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                >
                  {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('form.intensidad')}</label>
                <select
                  value={modalEditar.intensidad}
                  onChange={(e) => setModalEditar({ ...modalEditar, intensidad: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                >
                  {INTENSIDADES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('form.fecha')}</label>
                  <input
                    type="date" required
                    value={modalEditar.fecha}
                    onChange={(e) => setModalEditar({ ...modalEditar, fecha: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('form.hora')}</label>
                  <input
                    type="time" required
                    value={modalEditar.hora}
                    onChange={(e) => setModalEditar({ ...modalEditar, hora: e.target.value })}
                    onBlur={() => alPerderFocoEditar('hora')}
                    className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresEditar.hora ? 'border-card-red' : 'border-gray-300'}`}
                  />
                  {erroresEditar.hora && <p className="text-[11px] text-card-red-dark mt-1">{erroresEditar.hora}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('modal.cancha')}</label>
                <input
                  required
                  value={modalEditar.cancha}
                  onChange={(e) => setModalEditar({ ...modalEditar, cancha: e.target.value })}
                  onBlur={() => alPerderFocoEditar('cancha')}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresEditar.cancha ? 'border-card-red' : 'border-gray-300'}`}
                />
                {erroresEditar.cancha && <p className="text-[11px] text-card-red-dark mt-1">{erroresEditar.cancha}</p>}
              </div>
              {errorEditar && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{errorEditar}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  disabled={cargaActiva}
                  className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:acciones.cancelar')}
                </button>
                <button
                  disabled={cargaActiva}
                  className="px-3 py-1.5 rounded text-sm font-medium text-white bg-navy-900 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:acciones.guardarCambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: confirmar eliminación */}
      {confirmarEliminar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-2">
              {t('eliminar.titulo')}
            </h3>
            <p className="text-sm text-gray-500 mb-1">{confirmarEliminar.etiqueta}</p>
            <p className="text-xs text-gray-500 mb-4">
              {t('eliminar.aviso')}
            </p>
            {errorEliminar && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded mb-3">{errorEliminar}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmarEliminar(null)}
                disabled={cargaActiva}
                className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common:acciones.cancelar')}
              </button>
              <button
                onClick={confirmarEliminarEncuentro}
                disabled={cargaActiva}
                className="px-3 py-1.5 rounded text-sm font-medium text-white bg-card-red hover:bg-card-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common:acciones.eliminar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
