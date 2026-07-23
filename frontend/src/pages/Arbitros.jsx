import { useEffect, useState } from 'react';
import { IconEdit, IconUserOff, IconUserCheck, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const NIVELES = ['formacion', 'con_experiencia', 'nuevo'];
const ETIQUETA_NIVEL = {
  formacion: 'En formación',
  con_experiencia: 'Con experiencia',
  nuevo: 'Nuevo',
};
const FORM_VACIO = { cedula: '', nombres: '', apellidos: '', email: '', password: '', telefono: '' };
const soloLetras = (v) => v.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
const soloDigitos = (v) => v.replace(/\D/g, '');

export default function Arbitros() {
  const { usuario } = useAuth();
  const puedeGestionar = usuario?.rol === 'administrador' || usuario?.rol === 'directivo';
  const esAdmin = usuario?.rol === 'administrador';
  const [arbitros, setArbitros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [nivelesEditados, setNivelesEditados] = useState({});
  const [form, setForm] = useState(FORM_VACIO);

  // Editar árbitro
  const [modalEditar, setModalEditar] = useState(null); // { id, cedula, nombres, apellidos, email, telefono }
  const [errorEditar, setErrorEditar] = useState(null);

  // Eliminar árbitro
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // { id, nombre }
  const [preguntaHistorial, setPreguntaHistorial] = useState(null); // { id, nombre }

  function cargar() {
    api
      .get('/arbitros')
      .then((res) => setArbitros(res.data))
      .catch(() => setError('No se pudo cargar la lista de árbitros'))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  async function cambiarEstado(id, activo) {
    try {
      await api.put(`/arbitros/${id}/estado`, { activo });
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el estado');
    }
  }

  async function guardarNivel(id) {
    const nuevoNivel = nivelesEditados[id];
    if (!nuevoNivel) return;
    try {
      await api.put(`/arbitros/${id}/nivel`, { nivel: nuevoNivel });
      setNivelesEditados((prev) => { const copia = { ...prev }; delete copia[id]; return copia; });
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el nivel');
    }
  }

  function abrirEditar(a) {
    setErrorEditar(null);
    setModalEditar({
      id: a.id,
      cedula: a.cedula || '',
      nombres: a.nombres,
      apellidos: a.apellidos,
      email: a.email,
      telefono: a.telefono || '',
    });
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setErrorEditar(null);
    try {
      await api.put(`/arbitros/${modalEditar.id}`, {
        cedula: modalEditar.cedula,
        nombres: modalEditar.nombres,
        apellidos: modalEditar.apellidos,
        email: modalEditar.email,
        telefono: modalEditar.telefono,
      });
      setMensaje('Árbitro actualizado correctamente');
      setError(null);
      setModalEditar(null);
      cargar();
    } catch (err) {
      setErrorEditar(err.response?.data?.error || 'Error al actualizar el árbitro');
    }
  }

  async function confirmarEliminarArbitro() {
    const { id, nombre } = confirmarEliminar;
    try {
      await api.delete(`/arbitros/${id}`);
      setMensaje(`${nombre} fue eliminado correctamente`);
      setError(null);
      setConfirmarEliminar(null);
      cargar();
    } catch (err) {
      if (err.response?.data?.tieneHistorial) {
        // No lo bloqueamos con un error: le preguntamos qué prefiere hacer
        setConfirmarEliminar(null);
        setPreguntaHistorial({ id, nombre });
      } else {
        setError(err.response?.data?.error || 'Error al eliminar el árbitro');
        setConfirmarEliminar(null);
      }
    }
  }

  async function soloDesactivarDesdePregunta() {
    try {
      await api.put(`/arbitros/${preguntaHistorial.id}/estado`, { activo: false });
      setMensaje(`${preguntaHistorial.nombre} fue desactivado (conserva su historial)`);
      setError(null);
      setPreguntaHistorial(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar el árbitro');
      setPreguntaHistorial(null);
    }
  }

  async function eliminarConHistorial() {
    try {
      await api.delete(`/arbitros/${preguntaHistorial.id}?forzar=true`);
      setMensaje(`${preguntaHistorial.nombre} y todo su historial fueron eliminados por completo`);
      setError(null);
      setPreguntaHistorial(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar el árbitro');
      setPreguntaHistorial(null);
    }
  }

  async function registrar(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api.post('/auth/registro', { ...form, rol: 'arbitro' });
      setMensaje(`Árbitro ${form.nombres} ${form.apellidos} registrado correctamente`);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar el árbitro');
    }
  }

  if (cargando) return <p className="text-sm text-gray-500">Cargando...</p>;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h1 className="font-display text-2xl font-semibold text-navy-900 mb-5">Árbitros</h1>
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Email</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Nivel</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
                {esAdmin && <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {arbitros.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                  <td className="px-4 py-2.5 font-medium text-navy-900 whitespace-nowrap">{a.nombres} {a.apellidos}</td>
                  <td className="px-4 py-2.5 text-gray-500">{a.email}</td>
                  <td className="px-4 py-2.5">
                    {puedeGestionar ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={nivelesEditados[a.id] ?? a.nivel}
                          onChange={(e) => setNivelesEditados((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-navy-600"
                        >
                          {NIVELES.map((n) => (
                            <option key={n} value={n}>{ETIQUETA_NIVEL[n]}</option>
                          ))}
                        </select>
                        {nivelesEditados[a.id] && nivelesEditados[a.id] !== a.nivel && (
                          <button
                            onClick={() => guardarNivel(a.id)}
                            title="Guardar nivel"
                            className="text-navy-600 hover:text-navy-900"
                          >
                            <IconDeviceFloppy size={16} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="capitalize">{ETIQUETA_NIVEL[a.nivel]}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {a.activo ? (
                      <span className="text-pitch-green-dark text-xs font-medium">Activo</span>
                    ) : (
                      <span className="text-card-red-dark text-xs font-medium">Desactivado</span>
                    )}
                  </td>
                  {esAdmin && (
                    <td className="px-4 py-2.5">
                      <div className="flex gap-3 whitespace-nowrap">
                        <button
                          onClick={() => abrirEditar(a)}
                          title="Editar"
                          className="text-navy-600 hover:text-navy-900"
                        >
                          <IconEdit size={17} />
                        </button>
                        {a.activo ? (
                          <button
                            onClick={() => cambiarEstado(a.id, false)}
                            title="Desactivar"
                            className="text-card-red hover:text-card-red-dark"
                          >
                            <IconUserOff size={17} />
                          </button>
                        ) : (
                          <button
                            onClick={() => cambiarEstado(a.id, true)}
                            title="Reactivar"
                            className="text-pitch-green hover:text-pitch-green-dark"
                          >
                            <IconUserCheck size={17} />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmarEliminar({ id: a.id, nombre: `${a.nombres} ${a.apellidos}` })}
                          title="Eliminar"
                          className="text-gray-400 hover:text-card-red"
                        >
                          <IconTrash size={17} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {arbitros.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No hay árbitros registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {esAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">Registrar árbitro</h2>
          <form onSubmit={registrar} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cédula</label>
              <input
                required
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                placeholder="Ingrese los 10 dígitos de la cédula"
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: soloDigitos(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nombres</label>
              <input
                required
                placeholder="Solo letras"
                value={form.nombres}
                onChange={(e) => setForm({ ...form, nombres: soloLetras(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Apellidos</label>
              <input
                required
                placeholder="Solo letras"
                value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: soloLetras(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Teléfono</label>
              <input
                inputMode="numeric"
                maxLength={10}
                placeholder="7 a 10 dígitos"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: soloDigitos(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Contraseña temporal</label>
              <input
                type="password" required minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
            {mensaje && <p className="text-xs text-pitch-green-dark bg-pitch-green/10 px-2 py-1.5 rounded">{mensaje}</p>}
            <button className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition">
              Registrar árbitro
            </button>
          </form>
        </div>
      )}

      {/* Modal: editar árbitro */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-4">Editar árbitro</h3>
            <form onSubmit={guardarEdicion} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Cédula</label>
                <input
                  required inputMode="numeric" maxLength={10}
                  placeholder="Ingrese los 10 dígitos de la cédula"
                  value={modalEditar.cedula}
                  onChange={(e) => setModalEditar({ ...modalEditar, cedula: soloDigitos(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nombres</label>
                <input
                  required
                  value={modalEditar.nombres}
                  onChange={(e) => setModalEditar({ ...modalEditar, nombres: soloLetras(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Apellidos</label>
                <input
                  required
                  value={modalEditar.apellidos}
                  onChange={(e) => setModalEditar({ ...modalEditar, apellidos: soloLetras(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Email</label>
                <input
                  type="email" required
                  value={modalEditar.email}
                  onChange={(e) => setModalEditar({ ...modalEditar, email: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Teléfono</label>
                <input
                  inputMode="numeric" maxLength={10}
                  value={modalEditar.telefono}
                  onChange={(e) => setModalEditar({ ...modalEditar, telefono: soloDigitos(e.target.value) })}
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
              ¿Eliminar a {confirmarEliminar.nombre}?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción no se puede deshacer. Si el árbitro ya tiene designaciones, adelantos o
              liquidaciones registradas, el sistema no permitirá eliminarlo (usa "Desactivar" en ese caso).
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmarEliminar(null)}
                className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarArbitro}
                className="px-3 py-1.5 rounded text-sm font-medium text-white bg-card-red hover:bg-card-red-dark"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: pregunta cuando el árbitro tiene historial */}
      {preguntaHistorial && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-2">
              {preguntaHistorial.nombre} tiene historial en el sistema
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Tiene designaciones, adelantos, liquidaciones o disponibilidad registrada. ¿Qué quieres hacer?
            </p>
            <div className="space-y-2">
              <button
                onClick={soloDesactivarDesdePregunta}
                className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-navy-50 transition"
              >
                <p className="text-sm font-medium text-navy-900">Solo desactivarlo</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ya no podrá iniciar sesión ni ser designado, pero su historial se conserva completo.
                </p>
              </button>
              <button
                onClick={eliminarConHistorial}
                className="w-full text-left border border-card-red/30 rounded-lg p-3 hover:bg-card-red/5 transition"
              >
                <p className="text-sm font-medium text-card-red-dark">Eliminar del sistema por completo</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Borra también sus designaciones, adelantos y liquidaciones. No se puede deshacer.
                </p>
              </button>
            </div>
            <button
              onClick={() => setPreguntaHistorial(null)}
              className="w-full mt-3 px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
