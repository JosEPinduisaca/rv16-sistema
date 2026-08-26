import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconCheck, IconX, IconPlus } from '@tabler/icons-react';
import api from '../api/client';
import useCargaActiva from '../hooks/useCargaActiva';
import { esMontoPositivo } from '../utils/validaciones';
import TarjetaEstado from '../components/TarjetaEstado';

const MAX_DIAS_DEGRADADO = 14; // a partir de estos días, el color queda en naranja tope
// Gradiente continuo por antigüedad: no puede expresarse con los tokens de
// color discretos de index.css, por eso interpola rgb() directamente.
const COLOR_INICIO = [255, 247, 224]; // crema
const COLOR_FIN = [251, 146, 60]; // naranja

function diasDesde(fechaISO) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaISO);
  fecha.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((hoy - fecha) / (1000 * 60 * 60 * 24)));
}

function colorPorAntiguedad(dias) {
  const ratio = Math.min(dias / MAX_DIAS_DEGRADADO, 1);
  const [r1, g1, b1] = COLOR_INICIO;
  const [r2, g2, b2] = COLOR_FIN;
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Adelantos() {
  const { t } = useTranslation(['adelantos', 'common']);
  const [arbitros, setArbitros] = useState([]);
  const [todos, setTodos] = useState([]);
  const [arbitroSeleccionado, setArbitroSeleccionado] = useState('');
  const [monto, setMonto] = useState('');
  const [modalRegistrar, setModalRegistrar] = useState(false);
  const [error, setError] = useState(null);
  const [errorMonto, setErrorMonto] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const cargaActiva = useCargaActiva();

  const todosFiltrados = todos
    .filter((a) => `${a.nombres} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => (a.fecha_solicitud || '').localeCompare(b.fecha_solicitud || ''));

  function cargarTodos() {
    api.get('/adelantos').then((res) => setTodos(res.data));
  }

  useEffect(() => {
    api.get('/arbitros').then((res) => setArbitros(res.data));
    cargarTodos();
  }, []);

  function abrirRegistrar() {
    setArbitroSeleccionado('');
    setMonto('');
    setErrorMonto(null);
    setError(null);
    setModalRegistrar(true);
  }

  function alPerderFocoMonto() {
    setErrorMonto(esMontoPositivo(monto) ? null : t('validacion.montoInvalido'));
  }

  async function solicitar(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/adelantos', { arbitro_id: arbitroSeleccionado, monto: Number(monto) });
      setMonto('');
      setErrorMonto(null);
      setModalRegistrar(false);
      cargarTodos();
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorSolicitar'));
    }
  }

  async function cambiarEstado(id, estado) {
    try {
      await api.put(`/adelantos/${id}/estado`, { estado });
      cargarTodos();
    } catch (err) {
      setError(err.response?.data?.error || t('mensajes.errorActualizar'));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h1 className="font-display text-2xl font-semibold text-navy-900">{t('titulo')}</h1>
        <button
          onClick={abrirRegistrar}
          disabled={cargaActiva}
          className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconPlus size={16} />
          {t('registrarAdelanto')}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {t('leyenda.intro')}
        <span className="inline-block w-3 h-3 rounded-sm align-middle mx-1" style={{ backgroundColor: colorPorAntiguedad(0) }} />
        {t('leyenda.recienPedido')}
        <span className="inline-block w-3 h-3 rounded-sm align-middle mx-1" style={{ backgroundColor: colorPorAntiguedad(MAX_DIAS_DEGRADADO) }} />
        {t('leyenda.diasEsperando', { max: MAX_DIAS_DEGRADADO })}
      </p>

      {error && !modalRegistrar && <p className="text-xs text-card-red-dark bg-card-red/10 px-3 py-2 rounded mb-4">{error}</p>}

      <div className="max-w-xs mb-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t('buscar.placeholder')}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.arbitro')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.fechaPedida')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.monto')}</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.estado')}</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {todosFiltrados.map((a) => {
                const dias = diasDesde(a.fecha_solicitud);
                const esPendiente = a.estado === 'pendiente';
                return (
                  <tr
                    key={a.id}
                    className="border-t border-gray-100"
                    style={esPendiente ? { backgroundColor: colorPorAntiguedad(dias) } : undefined}
                  >
                    <td className="px-4 py-2.5 font-medium text-navy-900 whitespace-nowrap">{a.nombres} {a.apellidos}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{a.fecha_solicitud?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-navy-900">${a.monto}</td>
                    <td className="px-4 py-2.5"><TarjetaEstado estado={a.estado} /></td>
                    <td className="px-4 py-2.5">
                      {esPendiente && (
                        <div className="flex gap-3 whitespace-nowrap">
                          <button
                            onClick={() => cambiarEstado(a.id, 'aprobado')}
                            disabled={cargaActiva}
                            title={t('common:acciones.aprobar')}
                            className="text-pitch-green hover:text-pitch-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <IconCheck size={17} />
                          </button>
                          <button
                            onClick={() => cambiarEstado(a.id, 'rechazado')}
                            disabled={cargaActiva}
                            title={t('common:acciones.rechazar')}
                            className="text-card-red hover:text-card-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <IconX size={17} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {todosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    {busqueda ? t('vacioBusqueda') : t('vacio')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      {/* Modal: registrar adelanto */}
      {modalRegistrar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-4">{t('registrarAdelanto')}</h3>
            <form onSubmit={solicitar} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.arbitro')}</label>
                <select
                  required
                  value={arbitroSeleccionado}
                  onChange={(e) => setArbitroSeleccionado(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                >
                  <option value="">{t('campos.seleccionar')}</option>
                  {arbitros.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombres} {a.apellidos}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('campos.monto')}</label>
                <input
                  type="number" step="0.01" min="0.01" required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  onBlur={alPerderFocoMonto}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 ${errorMonto ? 'border-card-red' : 'border-gray-300'}`}
                />
                {errorMonto && <p className="text-[11px] text-card-red-dark mt-1">{errorMonto}</p>}
              </div>
              {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalRegistrar(false)}
                  disabled={cargaActiva}
                  className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:acciones.cancelar')}
                </button>
                <button
                  disabled={cargaActiva}
                  className="px-3 py-1.5 rounded text-sm font-medium text-white bg-navy-900 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:acciones.registrar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
