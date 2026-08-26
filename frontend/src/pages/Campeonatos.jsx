import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import useCargaActiva from '../hooks/useCargaActiva';
import usePaginacion from '../hooks/usePaginacion';
import Paginador from '../components/Paginador';
import { textoValido, soloLetras as esNombreValido, esMontoPositivo } from '../utils/validaciones';

const FORM_VACIO = {
  nombre: '', fecha_inicio: '', fecha_fin: '',
  tarifaSenior: '', tarifaMaster: '', tarifaFemenino: '', tarifaNinos: '',
};
const DIAS_POR_TERMINAR = 15;
const soloLetras = (v) => v.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
const hoyISO = () => new Date().toISOString().slice(0, 10);

const CATEGORIAS_TARIFA = [
  { campo: 'tarifaSenior', categoriaLabel: 'senior', categoria: 'senior' },
  { campo: 'tarifaMaster', categoriaLabel: 'master', categoria: 'master' },
  { campo: 'tarifaFemenino', categoriaLabel: 'femenino', categoria: 'femenino' },
  { campo: 'tarifaNinos', categoriaLabel: 'ninos', categoria: 'ninos' },
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
  const { t } = useTranslation(['campeonatos', 'common']);
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';
  const [campeonatos, setCampeonatos] = useState([]);
  const [modalCrear, setModalCrear] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [erroresForm, setErroresForm] = useState({});

  const [modalEditar, setModalEditar] = useState(null); // { id, nombre, fecha_inicio, fecha_fin }
  const [errorEditar, setErrorEditar] = useState(null);
  const [erroresEditar, setErroresEditar] = useState({});
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // { id, nombre }
  const [errorEliminar, setErrorEliminar] = useState(null);
  const cargaActiva = useCargaActiva();
  const { pagina, setPagina, totalPaginas, paginaActual: campeonatosPagina } = usePaginacion(campeonatos);

  function cargar() {
    api.get('/campeonatos').then((res) => setCampeonatos(res.data));
  }

  useEffect(cargar, []);

  // Valida un campo del formulario (nuevo o edición) al perder el foco.
  function validarCampo(campo, valores) {
    switch (campo) {
      case 'nombre':
        return textoValido(valores.nombre) && esNombreValido(valores.nombre) ? null : t('validacion.nombreInvalido');
      case 'fecha_fin':
        return !valores.fecha_fin || !valores.fecha_inicio || valores.fecha_fin >= valores.fecha_inicio
          ? null
          : t('validacion.fechaFinInvalida');
      case 'tarifaSenior':
      case 'tarifaMaster':
      case 'tarifaFemenino':
      case 'tarifaNinos':
        return !valores[campo] || esMontoPositivo(valores[campo]) ? null : t('validacion.montoInvalido');
      default:
        return null;
    }
  }

  function alPerderFoco(campo) {
    setErroresForm((prev) => ({ ...prev, [campo]: validarCampo(campo, form) }));
  }

  function alPerderFocoEditar(campo) {
    setErroresEditar((prev) => ({ ...prev, [campo]: validarCampo(campo, modalEditar) }));
  }

  function abrirCrear() {
    setForm(FORM_VACIO);
    setErroresForm({});
    setError(null);
    setMensaje(null);
    setModalCrear(true);
  }

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
          ? t('mensajes.creadoConTarifas', { cantidad: tarifasCreadas })
          : t('mensajes.creado')
      );
      setForm(FORM_VACIO);
      setErroresForm({});
      setModalCrear(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorCrear'));
    }
  }

  function abrirEditar(c) {
    setErrorEditar(null);
    setErroresEditar({});
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
      setErroresEditar({});
      cargar();
    } catch (err) {
      setErrorEditar(err.response?.data?.error || t('mensajes.errorActualizar'));
    }
  }

  async function confirmarEliminarCampeonato() {
    setErrorEliminar(null);
    try {
      await api.delete(`/campeonatos/${confirmarEliminar.id}`);
      setConfirmarEliminar(null);
      cargar();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || t('mensajes.errorEliminar'));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h1 className="font-display text-2xl font-semibold text-navy-900">{t('titulo')}</h1>
        {esAdmin && (
          <button
            onClick={abrirCrear}
            disabled={cargaActiva}
            className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconPlus size={16} />
            {t('nuevo.titulo')}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        <span className="inline-block w-3 h-3 rounded-sm bg-card-yellow/50 align-middle mr-1" />
        {t('leyenda.porTerminar', { dias: DIAS_POR_TERMINAR })}
        <span className="inline-block w-3 h-3 rounded-sm bg-card-red/25 align-middle ml-4 mr-1" />
        {t('leyenda.terminado')}
      </p>

      {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-3 py-2 rounded mb-4">{error}</p>}
      {mensaje && <p className="text-xs text-pitch-green-dark bg-pitch-green/10 px-3 py-2 rounded mb-4">{mensaje}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.nombre')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.inicio')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.fin')}</th>
                {esAdmin && <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.acciones')}</th>}
              </tr>
            </thead>
            <tbody>
              {campeonatosPagina.map((c) => {
                const estado = estadoFecha(c.fecha_fin);
                return (
                  <tr key={c.id} className={`border-t border-gray-100 transition ${CLASE_FILA[estado] || 'hover:bg-navy-50/40'}`}>
                    <td className="px-4 py-2.5 font-medium text-navy-900">{c.nombre}</td>
                    <td className="px-4 py-2.5 tabular-nums">{c.fecha_inicio?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{c.fecha_fin?.slice(0, 10) || '—'}</td>
                    {esAdmin && (
                      <td className="px-4 py-2.5">
                        <div className="flex gap-3">
                          <button
                            onClick={() => abrirEditar(c)}
                            disabled={cargaActiva}
                            title={t('common:acciones.editar')}
                            className="text-navy-600 hover:text-navy-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <IconEdit size={17} />
                          </button>
                          <button
                            onClick={() => { setErrorEliminar(null); setConfirmarEliminar({ id: c.id, nombre: c.nombre }); }}
                            disabled={cargaActiva}
                            title={t('common:acciones.eliminar')}
                            className="text-gray-400 hover:text-card-red disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {t('vacio')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
      <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />

      {/* Modal: nuevo campeonato */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-4">{t('nuevo.titulo')}</h3>
        <form onSubmit={crear} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('campos.nombre')}</label>
            <input
              required
              placeholder={t('campos.soloLetras')}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: soloLetras(e.target.value) })}
              onBlur={() => alPerderFoco('nombre')}
              className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresForm.nombre ? 'border-card-red' : 'border-gray-300'}`}
            />
            {erroresForm.nombre && <p className="text-[11px] text-card-red-dark mt-1">{erroresForm.nombre}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('campos.fechaInicio')}</label>
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
            <label className="block text-xs text-gray-600 mb-1">{t('campos.fechaFin')}</label>
            <input
              type="date"
              required
              min={form.fecha_inicio || hoyISO()}
              value={form.fecha_fin}
              onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
              onBlur={() => alPerderFoco('fecha_fin')}
              className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresForm.fecha_fin ? 'border-card-red' : 'border-gray-300'}`}
            />
            {erroresForm.fecha_fin && <p className="text-[11px] text-card-red-dark mt-1">{erroresForm.fecha_fin}</p>}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">
              {t('campos.tarifaBaseTitulo')}
            </p>
            <p className="text-[11px] text-gray-500 mb-2">
              {t('campos.tarifaBaseTexto')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS_TARIFA.map(({ campo, categoriaLabel }) => (
                <div key={campo}>
                  <label className="block text-[11px] text-gray-600 mb-0.5">{t(`categorias.${categoriaLabel}`)} ($)</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={form[campo]}
                    onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                    onBlur={() => alPerderFoco(campo)}
                    className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresForm[campo] ? 'border-card-red' : 'border-gray-300'}`}
                  />
                  {erroresForm[campo] && <p className="text-[11px] text-card-red-dark mt-1">{erroresForm[campo]}</p>}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
          {mensaje && <p className="text-xs text-pitch-green-dark bg-pitch-green/10 px-2 py-1.5 rounded">{mensaje}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModalCrear(false)}
              disabled={cargaActiva}
              className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common:acciones.cancelar')}
            </button>
            <button
              disabled={cargaActiva}
              className="px-3 py-1.5 rounded text-sm font-medium text-white bg-navy-900 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('nuevo.boton')}
            </button>
          </div>
        </form>
          </div>
        </div>
      )}

      {/* Modal: editar campeonato */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-4">{t('modal.editar.titulo')}</h3>
            <form onSubmit={guardarEdicion} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.nombre')}</label>
                <input
                  required
                  value={modalEditar.nombre}
                  onChange={(e) => setModalEditar({ ...modalEditar, nombre: soloLetras(e.target.value) })}
                  onBlur={() => alPerderFocoEditar('nombre')}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresEditar.nombre ? 'border-card-red' : 'border-gray-300'}`}
                />
                {erroresEditar.nombre && <p className="text-[11px] text-card-red-dark mt-1">{erroresEditar.nombre}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.fechaInicio')}</label>
                <input
                  type="date" required
                  value={modalEditar.fecha_inicio}
                  onChange={(e) => setModalEditar({ ...modalEditar, fecha_inicio: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.fechaFin')}</label>
                <input
                  type="date" required
                  value={modalEditar.fecha_fin}
                  onChange={(e) => setModalEditar({ ...modalEditar, fecha_fin: e.target.value })}
                  onBlur={() => alPerderFocoEditar('fecha_fin')}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${erroresEditar.fecha_fin ? 'border-card-red' : 'border-gray-300'}`}
                />
                {erroresEditar.fecha_fin && <p className="text-[11px] text-card-red-dark mt-1">{erroresEditar.fecha_fin}</p>}
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
              {t('modal.confirmarEliminar.titulo', { nombre: confirmarEliminar.nombre })}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('modal.confirmarEliminar.texto')}
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
                onClick={confirmarEliminarCampeonato}
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
