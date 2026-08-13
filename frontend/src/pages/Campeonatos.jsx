import { useEffect, useState } from 'react';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const FORM_VACIO = {
  nombre: '', fecha_inicio: '', fecha_fin: '',
  tarifaSenior: '', tarifaMaster: '', tarifaFemenino: '', tarifaNinos: '',
};
const DIAS_POR_TERMINAR = 15;
const soloLetras = (v) => v.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
const hoyISO = () => new Date().toISOString().slice(0, 10);

const CATEGORIAS_TARIFA = [
  { campo: 'tarifaSenior', label: 'Señor', categoria: 'senior' },
  { campo: 'tarifaMaster', label: 'Master', categoria: 'master' },
  { campo: 'tarifaFemenino', label: 'Femenino', categoria: 'femenino' },
  { campo: 'tarifaNinos', label: 'Niños', categoria: 'ninos' },
];

function estadoFecha(fechaFin) {
  if (!fechaFin) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  const diffDias = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return 'vencido';
  if (diffDias <= DIAS_POR_TERMINAR) return 'por_terminar';
  return null;
}

const CLASE_FILA = {
  vencido: 'bg-card-red/10 hover:bg-card-red/15',
  por_terminar: 'bg-card-yellow/15 hover:bg-card-yellow/25',
};

export default function Campeonatos() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';
  const [campeonatos, setCampeonatos] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [modalEditar, setModalEditar] = useState(null); // { id, nombre, fecha_inicio, fecha_fin }
  const [errorEditar, setErrorEditar] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // { id, nombre }
  const [errorEliminar, setErrorEliminar] = useState(null);

  function cargar() {
    api.get('/campeonatos').then((res) => setCampeonatos(res.data));
  }

  useEffect(cargar, []);

  async function crear(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      const { data: nuevoCampeonato } = await api.post('/campeonatos', {
        nombre: form.nombre,
        liga: form.nombre, // un solo campo representa tanto el nombre como la liga
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
      });

      // Crea una tarifa "central" por cada categoría con valor. Si necesitas
      // tarifa de "asistente" u otras, agrégalas después en "Tarifas".
      let tarifasCreadas = 0;
      for (const { campo, categoria } of CATEGORIAS_TARIFA) {
        const valor = form[campo];
        if (valor && Number(valor) > 0) {
          await api.post('/tarifas', {
            campeonato_id: nuevoCampeonato.id,
            categoria,
            rol_arbitro: 'central',
            monto: Number(valor),
            viatico: 0,
          });
          tarifasCreadas++;
        }
      }

      setMensaje(
        tarifasCreadas > 0
          ? `Campeonato creado con ${tarifasCreadas} tarifa(s). Puedes ajustar montos en "Tarifas".`
          : 'Campeonato creado correctamente.'
      );
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el campeonato');
    }
  }

  function abrirEditar(c) {
    setErrorEditar(null);
    setModalEditar({
      id: c.id,
      nombre: c.nombre,
      fecha_inicio: c.fecha_inicio?.slice(0, 10) || '',
      fecha_fin: c.fecha_fin?.slice(0, 10) || '',
    });
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setErrorEditar(null);
    try {
      await api.put(`/campeonatos/${modalEditar.id}`, {
        nombre: modalEditar.nombre,
        liga: modalEditar.nombre,
        fecha_inicio: modalEditar.fecha_inicio,
        fecha_fin: modalEditar.fecha_fin,
      });
      setModalEditar(null);
      cargar();
    } catch (err) {
      setErrorEditar(err.response?.data?.error || 'Error al actualizar el campeonato');
    }
  }

  async function confirmarEliminarCampeonato() {
    setErrorEliminar(null);
    try {
      await api.delete(`/campeonatos/${confirmarEliminar.id}`);
      setConfirmarEliminar(null);
      cargar();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'Error al eliminar el campeonato');
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h1 className="font-display text-2xl font-semibold text-navy-900 mb-2">Campeonatos</h1>
        <p className="text-xs text-gray-500 mb-4">
          <span className="inline-block w-3 h-3 rounded-sm bg-card-yellow/50 align-middle mr-1" />
          Por terminar (≤ {DIAS_POR_TERMINAR} días)
          <span className="inline-block w-3 h-3 rounded-sm bg-card-red/25 align-middle ml-4 mr-1" />
          Ya terminado
        </p>
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Inicio</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fin</th>
                {esAdmin && <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {campeonatos.map((c) => {
                const estado = estadoFecha(c.fecha_fin);
                return (
                  <tr key={c.id} className={`border-t border-gray-100 transition ${CLASE_FILA[estado] || 'hover:bg-navy-50/40'}`}>
                    <td className="px-4 py-2.5 font-medium text-navy-900">{c.nombre}</td>
                    <td className="px-4 py-2.5 tabular-nums">{c.fecha_inicio?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{c.fecha_fin?.slice(0, 10) || '—'}</td>
                    {esAdmin && (
                      <td className="px-4 py-2.5">
                        <div className="flex gap-3">
                          <button onClick={() => abrirEditar(c)} title="Editar" className="text-navy-600 hover:text-navy-900">
                            <IconEdit size={17} />
                          </button>
                          <button
                            onClick={() => { setErrorEliminar(null); setConfirmarEliminar({ id: c.id, nombre: c.nombre }); }}
                            title="Eliminar"
                            className="text-gray-400 hover:text-card-red"
                          >
                            <IconTrash size={17} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {campeonatos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Aún no hay campeonatos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">Nuevo campeonato</h2>
        <form onSubmit={crear} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nombre del campeonato o liga</label>
            <input
              required
              placeholder="Solo letras"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: soloLetras(e.target.value) })}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fecha inicio</label>
            <input
              type="date"
              required
              min={hoyISO()}
              value={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fecha fin</label>
            <input
              type="date"
              required
              min={form.fecha_inicio || hoyISO()}
              value={form.fecha_fin}
              onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">
              Tarifa base por categoría (opcional)
            </p>
            <p className="text-[11px] text-gray-500 mb-2">
              Se crea como rol Central (la intensidad no afecta el pago). Si necesitas tarifa de
              Asistente u otras, agrégalas después en "Tarifas".
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS_TARIFA.map(({ campo, label }) => (
                <div key={campo}>
                  <label className="block text-[11px] text-gray-600 mb-0.5">{label} ($)</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={form[campo]}
                    onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
          {mensaje && <p className="text-xs text-pitch-green-dark bg-pitch-green/10 px-2 py-1.5 rounded">{mensaje}</p>}
          <button className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition">
            Crear
          </button>
        </form>
      </div>

      {/* Modal: editar campeonato */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-4">Editar campeonato</h3>
            <form onSubmit={guardarEdicion} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nombre del campeonato o liga</label>
                <input
                  required
                  value={modalEditar.nombre}
                  onChange={(e) => setModalEditar({ ...modalEditar, nombre: soloLetras(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fecha inicio</label>
                <input
                  type="date" required
                  value={modalEditar.fecha_inicio}
                  onChange={(e) => setModalEditar({ ...modalEditar, fecha_inicio: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fecha fin</label>
                <input
                  type="date" required
                  value={modalEditar.fecha_fin}
                  onChange={(e) => setModalEditar({ ...modalEditar, fecha_fin: e.target.value })}
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
              ¿Eliminar {confirmarEliminar.nombre}?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción no se puede deshacer. Si ya tiene encuentros registrados, el sistema no
              permitirá eliminarlo para no perder ese historial.
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
                onClick={confirmarEliminarCampeonato}
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
