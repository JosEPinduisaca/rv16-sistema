import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconEdit, IconUserOff, IconUserCheck, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import TarjetaEstado from '../components/TarjetaEstado';
import {
  validarCedulaEcuatoriana,
  validarEmail,
  validarTelefono,
  soloLetras as esNombreValido,
  textoValido,
} from '../utils/validaciones';

const NIVELES = ['formacion', 'con_experiencia', 'nuevo'];
const FORM_VACIO = { cedula: '', nombres: '', apellidos: '', email: '', password: '', telefono: '' };
const soloLetras = (v) => v.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
const soloDigitos = (v) => v.replace(/\D/g, '');

export default function Arbitros() {
  const { t } = useTranslation(['arbitros', 'common']);
  const ETIQUETA_NIVEL = {
    formacion: t('niveles.formacion'),
    con_experiencia: t('niveles.con_experiencia'),
    nuevo: t('niveles.nuevo'),
  };
  const { usuario } = useAuth();
  const puedeGestionar = usuario?.rol === 'administrador' || usuario?.rol === 'directivo';
  const esAdmin = usuario?.rol === 'administrador';
  const [arbitros, setArbitros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [nivelesEditados, setNivelesEditados] = useState({});
  const [form, setForm] = useState(FORM_VACIO);
  const [erroresRegistro, setErroresRegistro] = useState({});

  // Editar árbitro
  const [modalEditar, setModalEditar] = useState(null); // { id, cedula, nombres, apellidos, email, telefono }
  const [errorEditar, setErrorEditar] = useState(null);
  const [erroresEditar, setErroresEditar] = useState({});

  // Eliminar árbitro
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // { id, nombre }
  const [preguntaHistorial, setPreguntaHistorial] = useState(null); // { id, nombre }

  function cargar() {
    api
      .get('/arbitros')
      .then((res) => setArbitros(res.data))
      .catch(() => setError(t('mensajes.errorCargar')))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function cambiarEstado(id, activo) {
    try {
      await api.put(`/arbitros/${id}/estado`, { activo });
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorEstado'));
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
      setError(err.response?.data?.error || t('mensajes.errorNivel'));
    }
  }

  function abrirEditar(a) {
    setErrorEditar(null);
    setErroresEditar({});
    setModalEditar({
      id: a.id,
      cedula: a.cedula || '',
      nombres: a.nombres,
      apellidos: a.apellidos,
      email: a.email,
      telefono: a.telefono || '',
    });
  }

  function alPerderFocoEditar(campo) {
    const valor = modalEditar[campo];
    // El teléfono es opcional: no marcarlo como error mientras esté vacío.
    if (campo === 'telefono' && !valor) {
      setErroresEditar((prev) => ({ ...prev, telefono: null }));
      return;
    }
    setErroresEditar((prev) => ({ ...prev, [campo]: validarCampoRegistro(campo, valor) }));
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
      setMensaje(t('mensajes.editado'));
      setError(null);
      setModalEditar(null);
      setErroresEditar({});
      cargar();
    } catch (err) {
      setErrorEditar(err.response?.data?.error || t('mensajes.errorEditar'));
    }
  }

  async function confirmarEliminarArbitro() {
    const { id, nombre } = confirmarEliminar;
    try {
      await api.delete(`/arbitros/${id}`);
      setMensaje(t('mensajes.eliminado', { nombre }));
      setError(null);
      setConfirmarEliminar(null);
      cargar();
    } catch (err) {
      if (err.response?.data?.tieneHistorial) {
        // No lo bloqueamos con un error: le preguntamos qué prefiere hacer
        setConfirmarEliminar(null);
        setPreguntaHistorial({ id, nombre });
      } else {
        setError(err.response?.data?.error || t('mensajes.errorEliminar'));
        setConfirmarEliminar(null);
      }
    }
  }

  async function soloDesactivarDesdePregunta() {
    try {
      await api.put(`/arbitros/${preguntaHistorial.id}/estado`, { activo: false });
      setMensaje(t('mensajes.desactivado', { nombre: preguntaHistorial.nombre }));
      setError(null);
      setPreguntaHistorial(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorDesactivar'));
      setPreguntaHistorial(null);
    }
  }

  async function eliminarConHistorial() {
    try {
      await api.delete(`/arbitros/${preguntaHistorial.id}?forzar=true`);
      setMensaje(t('mensajes.eliminadoConHistorial', { nombre: preguntaHistorial.nombre }));
      setError(null);
      setPreguntaHistorial(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorEliminar'));
      setPreguntaHistorial(null);
    }
  }

  // Valida un solo campo del formulario de registro; se llama al perder el
  // foco (onBlur) para dar feedback inmediato, sin esperar al submit.
  function validarCampoRegistro(campo, valor) {
    switch (campo) {
      case 'cedula':
        return validarCedulaEcuatoriana(valor) ? null : t('validacion.cedulaInvalida');
      case 'nombres':
        return textoValido(valor) && esNombreValido(valor) ? null : t('validacion.nombresInvalidos');
      case 'apellidos':
        return textoValido(valor) && esNombreValido(valor) ? null : t('validacion.apellidosInvalidos');
      case 'email':
        return validarEmail(valor) ? null : t('validacion.emailInvalido');
      case 'telefono':
        return validarTelefono(valor) ? null : t('validacion.telefonoInvalido');
      case 'password':
        return valor.length >= 6 ? null : t('validacion.passwordCorta');
      default:
        return null;
    }
  }

  function alPerderFocoRegistro(campo) {
    const valor = form[campo];
    // El teléfono es opcional: no marcarlo como error mientras esté vacío.
    if (campo === 'telefono' && !valor) {
      setErroresRegistro((prev) => ({ ...prev, telefono: null }));
      return;
    }
    setErroresRegistro((prev) => ({ ...prev, [campo]: validarCampoRegistro(campo, valor) }));
  }

  async function registrar(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api.post('/auth/registro', { ...form, rol: 'arbitro' });
      setMensaje(t('mensajes.registrado', { nombres: form.nombres, apellidos: form.apellidos }));
      setForm(FORM_VACIO);
      setErroresRegistro({});
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorRegistrar'));
    }
  }

  if (cargando) return <p className="text-sm text-gray-500">{t('common:estado.cargando')}</p>;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h1 className="font-display text-2xl font-semibold text-navy-900 mb-5">{t('titulo')}</h1>
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.nombre')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.email')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.nivel')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.estado')}</th>
                {esAdmin && <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.acciones')}</th>}
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
                            title={t('acciones.guardarNivel')}
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
                    <TarjetaEstado estado={a.activo ? 'activo' : 'desactivado'} />
                  </td>
                  {esAdmin && (
                    <td className="px-4 py-2.5">
                      <div className="flex gap-3 whitespace-nowrap">
                        <button
                          onClick={() => abrirEditar(a)}
                          title={t('common:acciones.editar')}
                          className="text-navy-600 hover:text-navy-900"
                        >
                          <IconEdit size={17} />
                        </button>
                        {a.activo ? (
                          <button
                            onClick={() => cambiarEstado(a.id, false)}
                            title={t('common:acciones.desactivar')}
                            className="text-card-red hover:text-card-red-dark"
                          >
                            <IconUserOff size={17} />
                          </button>
                        ) : (
                          <button
                            onClick={() => cambiarEstado(a.id, true)}
                            title={t('common:acciones.reactivar')}
                            className="text-pitch-green hover:text-pitch-green-dark"
                          >
                            <IconUserCheck size={17} />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmarEliminar({ id: a.id, nombre: `${a.nombres} ${a.apellidos}` })}
                          title={t('common:acciones.eliminar')}
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
                    {t('vacio')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {esAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">{t('registrar.titulo')}</h2>
          <form onSubmit={registrar} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('campos.cedula')}</label>
              <input
                required
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                placeholder={t('campos.cedulaPlaceholder')}
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: soloDigitos(e.target.value) })}
                onBlur={() => alPerderFocoRegistro('cedula')}
                className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresRegistro.cedula ? 'border-card-red' : 'border-gray-300'}`}
              />
              {erroresRegistro.cedula && <p className="text-[11px] text-card-red-dark mt-1">{erroresRegistro.cedula}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('campos.nombres')}</label>
              <input
                required
                placeholder={t('campos.soloLetras')}
                value={form.nombres}
                onChange={(e) => setForm({ ...form, nombres: soloLetras(e.target.value) })}
                onBlur={() => alPerderFocoRegistro('nombres')}
                className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresRegistro.nombres ? 'border-card-red' : 'border-gray-300'}`}
              />
              {erroresRegistro.nombres && <p className="text-[11px] text-card-red-dark mt-1">{erroresRegistro.nombres}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('campos.apellidos')}</label>
              <input
                required
                placeholder={t('campos.soloLetras')}
                value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: soloLetras(e.target.value) })}
                onBlur={() => alPerderFocoRegistro('apellidos')}
                className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresRegistro.apellidos ? 'border-card-red' : 'border-gray-300'}`}
              />
              {erroresRegistro.apellidos && <p className="text-[11px] text-card-red-dark mt-1">{erroresRegistro.apellidos}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('campos.email')}</label>
              <input
                type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onBlur={() => alPerderFocoRegistro('email')}
                className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresRegistro.email ? 'border-card-red' : 'border-gray-300'}`}
              />
              {erroresRegistro.email && <p className="text-[11px] text-card-red-dark mt-1">{erroresRegistro.email}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('campos.telefono')}</label>
              <input
                inputMode="numeric"
                maxLength={10}
                placeholder={t('campos.telefonoPlaceholder')}
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: soloDigitos(e.target.value) })}
                onBlur={() => alPerderFocoRegistro('telefono')}
                className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresRegistro.telefono ? 'border-card-red' : 'border-gray-300'}`}
              />
              {erroresRegistro.telefono && <p className="text-[11px] text-card-red-dark mt-1">{erroresRegistro.telefono}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('campos.passwordTemporal')}</label>
              <input
                type="password" required minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onBlur={() => alPerderFocoRegistro('password')}
                className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresRegistro.password ? 'border-card-red' : 'border-gray-300'}`}
              />
              {erroresRegistro.password && <p className="text-[11px] text-card-red-dark mt-1">{erroresRegistro.password}</p>}
            </div>
            {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
            {mensaje && <p className="text-xs text-pitch-green-dark bg-pitch-green/10 px-2 py-1.5 rounded">{mensaje}</p>}
            <button className="w-full bg-navy-900 hover:bg-navy-800 text-white py-2 rounded text-sm font-medium transition">
              {t('registrar.boton')}
            </button>
          </form>
        </div>
      )}

      {/* Modal: editar árbitro */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-4">{t('modal.editar.titulo')}</h3>
            <form onSubmit={guardarEdicion} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.cedula')}</label>
                <input
                  required inputMode="numeric" maxLength={10}
                  placeholder={t('campos.cedulaPlaceholder')}
                  value={modalEditar.cedula}
                  onChange={(e) => setModalEditar({ ...modalEditar, cedula: soloDigitos(e.target.value) })}
                  onBlur={() => alPerderFocoEditar('cedula')}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresEditar.cedula ? 'border-card-red' : 'border-gray-300'}`}
                />
                {erroresEditar.cedula && <p className="text-[11px] text-card-red-dark mt-1">{erroresEditar.cedula}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.nombres')}</label>
                <input
                  required
                  value={modalEditar.nombres}
                  onChange={(e) => setModalEditar({ ...modalEditar, nombres: soloLetras(e.target.value) })}
                  onBlur={() => alPerderFocoEditar('nombres')}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresEditar.nombres ? 'border-card-red' : 'border-gray-300'}`}
                />
                {erroresEditar.nombres && <p className="text-[11px] text-card-red-dark mt-1">{erroresEditar.nombres}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.apellidos')}</label>
                <input
                  required
                  value={modalEditar.apellidos}
                  onChange={(e) => setModalEditar({ ...modalEditar, apellidos: soloLetras(e.target.value) })}
                  onBlur={() => alPerderFocoEditar('apellidos')}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresEditar.apellidos ? 'border-card-red' : 'border-gray-300'}`}
                />
                {erroresEditar.apellidos && <p className="text-[11px] text-card-red-dark mt-1">{erroresEditar.apellidos}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.email')}</label>
                <input
                  type="email" required
                  value={modalEditar.email}
                  onChange={(e) => setModalEditar({ ...modalEditar, email: e.target.value })}
                  onBlur={() => alPerderFocoEditar('email')}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresEditar.email ? 'border-card-red' : 'border-gray-300'}`}
                />
                {erroresEditar.email && <p className="text-[11px] text-card-red-dark mt-1">{erroresEditar.email}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.telefono')}</label>
                <input
                  inputMode="numeric" maxLength={10}
                  value={modalEditar.telefono}
                  onChange={(e) => setModalEditar({ ...modalEditar, telefono: soloDigitos(e.target.value) })}
                  onBlur={() => alPerderFocoEditar('telefono')}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresEditar.telefono ? 'border-card-red' : 'border-gray-300'}`}
                />
                {erroresEditar.telefono && <p className="text-[11px] text-card-red-dark mt-1">{erroresEditar.telefono}</p>}
              </div>
              {errorEditar && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{errorEditar}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  {t('common:acciones.cancelar')}
                </button>
                <button className="px-3 py-1.5 rounded text-sm font-medium text-white bg-navy-900 hover:bg-navy-800">
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
              {t('modal.confirmarEliminar.titulo', { nombre: confirmarEliminar.nombre })}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('modal.confirmarEliminar.texto')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmarEliminar(null)}
                className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                {t('common:acciones.cancelar')}
              </button>
              <button
                onClick={confirmarEliminarArbitro}
                className="px-3 py-1.5 rounded text-sm font-medium text-white bg-card-red hover:bg-card-red-dark"
              >
                {t('common:acciones.eliminar')}
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
              {t('modal.preguntaHistorial.titulo', { nombre: preguntaHistorial.nombre })}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {t('modal.preguntaHistorial.texto')}
            </p>
            <div className="space-y-2">
              <button
                onClick={soloDesactivarDesdePregunta}
                className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-navy-50 transition"
              >
                <p className="text-sm font-medium text-navy-900">{t('modal.preguntaHistorial.opcionDesactivar.titulo')}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('modal.preguntaHistorial.opcionDesactivar.descripcion')}
                </p>
              </button>
              <button
                onClick={eliminarConHistorial}
                className="w-full text-left border border-card-red/30 rounded-lg p-3 hover:bg-card-red/5 transition"
              >
                <p className="text-sm font-medium text-card-red-dark">{t('modal.preguntaHistorial.opcionEliminar.titulo')}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('modal.preguntaHistorial.opcionEliminar.descripcion')}
                </p>
              </button>
            </div>
            <button
              onClick={() => setPreguntaHistorial(null)}
              className="w-full mt-3 px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              {t('common:acciones.cancelar')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
