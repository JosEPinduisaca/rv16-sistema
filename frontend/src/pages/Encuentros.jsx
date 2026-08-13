import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconTrash } from '@tabler/icons-react';
import api from '../api/client';
import TarjetaEstado from '../components/TarjetaEstado';

const INTENSIDADES = ['alta', 'media', 'baja'];
const MODOS_ENCUENTRO = [
  { v: 'normal', l: 'Normal' },
  { v: 'con_asistentes', l: 'Con asistentes' },
  { v: 'dos_centrales', l: 'Dos centrales' },
];
const hoyISO = () => new Date().toISOString().slice(0, 10);

const FORM_VACIO = {
  campeonato_id: '', categoria: '', intensidad: INTENSIDADES[0], fecha: '', hora: '',
  mas_de_una_cancha: 'no', cantidad_canchas: '2', tipo_numeracion: 'numeros',
  modo_designacion: 'normal',
};
const FILTROS_ESTADO = [
  { value: '', label: 'Todos' },
  { value: 'programado', label: 'Programar' },
  { value: 'designado', label: 'Designados' },
  { value: 'publicado', label: 'Publicados' },
];

export default function Encuentros() {
  const [encuentros, setEncuentros] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [campeonatos, setCampeonatos] = useState([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [tarifasCampeonato, setTarifasCampeonato] = useState([]);
  const [ultimoEncuentroId, setUltimoEncuentroId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [modalEditar, setModalEditar] = useState(null);
  const [errorEditar, setErrorEditar] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // { id, etiqueta }
  const [errorEliminar, setErrorEliminar] = useState(null);

  function cargar(estado = filtroEstado) {
    const url = estado ? `/encuentros?estado=${estado}` : '/encuentros';
    api.get(url).then((res) => setEncuentros(res.data));
  }

  function cambiarFiltro(estado) {
    setFiltroEstado(estado);
    cargar(estado);
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

  async function ingresar(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    if (form.hora === '00:00') {
      setError('La hora no puede ser 00:00, elige una hora real del partido');
      return;
    }

    const cantidad = form.mas_de_una_cancha === 'si' ? (Number(form.cantidad_canchas) || 2) : 1;
    const nombreBase = nombreCampeonato(form.campeonato_id);

    function etiquetaCancha(i) {
      if (cantidad === 1) return `Cancha ${nombreBase}`;
      const sufijo = form.tipo_numeracion === 'letras' ? String.fromCharCode(64 + i) : i;
      return `Cancha ${nombreBase} ${sufijo}`;
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
          ? 'Encuentro ingresado correctamente'
          : `${creados} encuentros ingresados (uno por cada cancha) en el mismo horario`
      );
      // Solo tiene sentido ofrecer el atajo de "Añadir asistentes" cuando se
      // creó un único encuentro (con varias canchas no sabríamos a cuál ir)
      // y cuando esa categoría ya tiene tarifa de Asistente configurada.
      setUltimoEncuentroId(
        creados === 1 && (tieneTarifaAsistente(categoriaCreada) || form.modo_designacion === 'dos_centrales')
          ? idCreado
          : null
      );
      setForm(FORM_VACIO);
      setCategoriasDisponibles([]);
      setTarifasCampeonato([]);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al ingresar el encuentro');
    }
  }

  async function abrirEditar(en) {
    setErrorEditar(null);
    setModalEditar({
      id: en.id,
      campeonato_id: en.campeonato_id,
      categoria: en.categoria,
      intensidad: en.intensidad,
      fecha: en.fecha?.slice(0, 10),
      hora: en.hora?.slice(0, 5),
      cancha: en.cancha,
    });
    await alSeleccionarCampeonato(en.campeonato_id, 'modal');
    setCategoriasDisponibles((prev) => (prev.includes(en.categoria) ? prev : [...prev, en.categoria]));
    setModalEditar((prev) => ({ ...prev, categoria: en.categoria, cancha: en.cancha }));
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setErrorEditar(null);

    if (modalEditar.hora === '00:00') {
      setErrorEditar('La hora no puede ser 00:00, elige una hora real del partido');
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
      cargar();
    } catch (err) {
      setErrorEditar(err.response?.data?.error || 'Error al actualizar el encuentro');
    }
  }

  async function confirmarEliminarEncuentro() {
    setErrorEliminar(null);
    try {
      await api.delete(`/encuentros/${confirmarEliminar.id}`);
      setConfirmarEliminar(null);
      cargar();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'Error al eliminar el encuentro');
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
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h1 className="font-display text-2xl font-semibold text-navy-900 mb-3">Encuentros</h1>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs mb-3">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.value}
              onClick={() => cambiarFiltro(f.value)}
              className={`px-3 py-1.5 font-medium transition ${
                filtroEstado === f.value ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Hora</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Cancha</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Categoría</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {encuentros.map((en) => (
                <tr key={en.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                  <td className="px-4 py-2.5">{en.fecha?.slice(0, 10)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{en.hora}</td>
                  <td className="px-4 py-2.5">{en.cancha}</td>
                  <td className="px-4 py-2.5 capitalize">{en.categoria}</td>
                  <td className="px-4 py-2.5"><TarjetaEstado estado={en.estado} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <button onClick={() => abrirEditar(en)} className="text-navy-600 hover:text-navy-900 hover:underline text-xs font-medium">
                        Editar
                      </button>
                      <Link to={`/designaciones?encuentro=${en.id}`} className="text-navy-600 hover:text-navy-900 hover:underline text-xs font-medium">
                        Designar
                      </Link>
                      <button
                        onClick={() => { setErrorEliminar(null); setConfirmarEliminar({ id: en.id, etiqueta: `${en.cancha} · ${en.fecha?.slice(0, 10)} ${en.hora?.slice(0, 5)}` }); }}
                        title="Eliminar"
                        className="text-gray-400 hover:text-card-red"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {encuentros.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Aún no hay encuentros registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">Ingresar encuentro</h2>
        <form onSubmit={ingresar} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          {!form.campeonato_id && (
            <div className="bg-card-yellow/20 border border-card-yellow-dark/40 text-card-yellow-dark text-sm font-semibold rounded-md px-3 py-2 text-center">
              Primero elige un campeonato
            </div>
          )}
          {/* 1. Campeonato primero: de él dependen categoría y tarifas */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Campeonato</label>
            <select
              required
              value={form.campeonato_id}
              onChange={(e) => alSeleccionarCampeonato(e.target.value, 'form')}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="">Selecciona...</option>
              {campeonatos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* 2. Categoría, depende del campeonato elegido: solo aparece
              una vez que se eligió el campeonato */}
          {form.campeonato_id && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Categoría</label>
            <select
              required
              value={form.categoria}
              onChange={(e) => alElegirCategoria(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="">Selecciona...</option>
              {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {categoriasDisponibles.length === 0 && (
              <p className="text-[11px] text-card-red-dark mt-1">Este campeonato no tiene tarifas configuradas todavía.</p>
            )}
            {form.categoria && tieneTarifaAsistente(form.categoria) && (
              <p className="text-[11px] text-pitch-green-dark mt-1">
                ✓ Esta categoría admite Asistentes (podrás añadirlos al designar).
              </p>
            )}
          </div>
          )}

          {/* 3. El resto del formulario aparece una vez que se eligió la categoría */}
          {form.categoria && (
          <>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Intensidad</label>
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
              <label className="block text-xs text-gray-600 mb-1">Hora</label>
              <input
                type="time" required
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
          </div>

          {/* Modo del encuentro: "Con asistentes" solo aparece si la categoría
              elegida ya tiene tarifa de Asistente configurada */}
          <div className="bg-navy-50 border border-navy-100 rounded-md p-3">
            <label className="block text-xs font-bold text-navy-900 mb-2 tracking-wide">
              Este encuentro es:
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
                  {op.l}
                </button>
              ))}
            </div>
          </div>

          {/* ¿Más de una cancha en este horario? Sí/No */}
          <div className="bg-card-yellow/15 border border-card-yellow-dark/30 rounded-md p-3">
            <label className="block text-xs font-semibold text-card-yellow-dark mb-1.5">
              ¿Es más de una cancha en este horario?
            </label>
            <div className="inline-flex rounded-md border border-card-yellow-dark/40 overflow-hidden text-xs">
              {[{ v: 'no', l: 'No' }, { v: 'si', l: 'Sí' }].map((op) => (
                <button
                  key={op.v}
                  type="button"
                  onClick={() => setForm({ ...form, mas_de_una_cancha: op.v })}
                  className={`px-4 py-1.5 font-medium transition ${
                    form.mas_de_una_cancha === op.v ? 'bg-card-yellow-dark text-white' : 'bg-white text-gray-600'
                  }`}
                >
                  {op.l}
                </button>
              ))}
            </div>

            {form.mas_de_una_cancha === 'si' && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">¿Cuántas canchas?</label>
                  <input
                    type="number" min="2" max="20" step="1" required
                    value={form.cantidad_canchas}
                    onChange={(e) => setForm({ ...form, cantidad_canchas: e.target.value })}
                    className="w-full border border-card-yellow-dark/40 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-card-yellow-dark"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Numerar las canchas con...</label>
                  <select
                    value={form.tipo_numeracion}
                    onChange={(e) => setForm({ ...form, tipo_numeracion: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                  >
                    <option value="numeros">Números (1, 2, 3...)</option>
                    <option value="letras">Letras (A, B, C...)</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-600">
                  Se crearán {form.cantidad_canchas} encuentros en el mismo horario, uno por cancha.
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
          {mensaje && (
            <div className="bg-pitch-green/10 rounded px-2 py-1.5 space-y-2">
              <p className="text-xs text-pitch-green-dark">{mensaje}</p>
              {ultimoEncuentroId && (
                <Link
                  to={`/designaciones?encuentro=${ultimoEncuentroId}`}
                  className="inline-block bg-navy-900 hover:bg-navy-800 text-white text-xs px-3 py-1.5 rounded font-medium transition"
                >
                  + Designar ahora
                </Link>
              )}
            </div>
          )}
          <button className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition">
            Ingresar encuentro
          </button>
          </>
          )}
        </form>
      </div>

      {/* Modal: editar encuentro */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-4">Editar encuentro</h3>
            <form onSubmit={guardarEdicion} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Categoría</label>
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
                <label className="block text-xs text-gray-600 mb-1">Intensidad</label>
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
                  <label className="block text-xs text-gray-600 mb-1">Fecha</label>
                  <input
                    type="date" required
                    value={modalEditar.fecha}
                    onChange={(e) => setModalEditar({ ...modalEditar, fecha: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Hora</label>
                  <input
                    type="time" required
                    value={modalEditar.hora}
                    onChange={(e) => setModalEditar({ ...modalEditar, hora: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Cancha</label>
                <input
                  required
                  value={modalEditar.cancha}
                  onChange={(e) => setModalEditar({ ...modalEditar, cancha: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              {errorEditar && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{errorEditar}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button className="px-3 py-1.5 rounded text-sm font-medium text-white bg-navy-900 hover:bg-navy-800">
                  Guardar cambios
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
              ¿Eliminar este encuentro?
            </h3>
            <p className="text-sm text-gray-500 mb-1">{confirmarEliminar.etiqueta}</p>
            <p className="text-xs text-gray-500 mb-4">
              Si ya tiene árbitros designados, primero debes quitarlos desde "Designación general".
            </p>
            {errorEliminar && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded mb-3">{errorEliminar}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmarEliminar(null)}
                className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarEncuentro}
                className="px-3 py-1.5 rounded text-sm font-medium text-white bg-card-red hover:bg-card-red-dark"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
