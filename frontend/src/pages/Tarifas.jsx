import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import api from '../api/client';

const ROLES = ['central', 'asistente'];

export default function Tarifas() {
  const { t } = useTranslation(['tarifas', 'common']);
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState('');
  const [tarifas, setTarifas] = useState([]);

  const [modalNueva, setModalNueva] = useState(null); // { categoria, monto }
  const [errorNueva, setErrorNueva] = useState(null);

  const [modalEditar, setModalEditar] = useState(null); // { id, categoria, rol_arbitro, monto }
  const [errorEditar, setErrorEditar] = useState(null);
  const [nuevoRolMonto, setNuevoRolMonto] = useState('');
  const [mensajeNuevoRol, setMensajeNuevoRol] = useState(null);
  const [errorNuevoRol, setErrorNuevoRol] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // { id, etiqueta }
  const [errorEliminar, setErrorEliminar] = useState(null);

  useEffect(() => {
    api.get('/campeonatos').then((res) => setCampeonatos(res.data));
  }, []);

  function cargarTarifas(id) {
    setCampeonatoId(id);
    if (!id) {
      setTarifas([]);
      return;
    }
    api.get(`/tarifas?campeonato_id=${id}`).then((res) => setTarifas(res.data));
  }

  // --- Crear categoría nueva (siempre arranca con la tarifa "central") ---
  function abrirNuevaCategoria() {
    setErrorNueva(null);
    setModalNueva({ categoria: '', monto: '' });
  }

  async function crearCategoria(e) {
    e.preventDefault();
    setErrorNueva(null);
    try {
      await api.post('/tarifas', {
        campeonato_id: campeonatoId,
        categoria: modalNueva.categoria,
        rol_arbitro: 'central',
        monto: Number(modalNueva.monto),
        viatico: 0,
      });
      setModalNueva(null);
      cargarTarifas(campeonatoId);
    } catch (err) {
      setErrorNueva(err.response?.data?.error || t('mensajes.errorCrearCategoria'));
    }
  }

  // --- Editar (solo el monto; categoría y rol quedan fijos) ---
  function abrirEditar(t) {
    setErrorEditar(null);
    setMensajeNuevoRol(null);
    setErrorNuevoRol(null);
    setNuevoRolMonto('');
    setModalEditar({ id: t.id, categoria: t.categoria, rol_arbitro: t.rol_arbitro, monto: String(t.monto) });
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setErrorEditar(null);
    try {
      await api.put(`/tarifas/${modalEditar.id}`, {
        monto: Number(modalEditar.monto),
        viatico: 0,
      });
      setModalEditar(null);
      cargarTarifas(campeonatoId);
    } catch (err) {
      setErrorEditar(err.response?.data?.error || t('mensajes.errorActualizar'));
    }
  }

  async function agregarRolFaltante(rolFaltante) {
    setErrorNuevoRol(null);
    setMensajeNuevoRol(null);
    try {
      await api.post('/tarifas', {
        campeonato_id: campeonatoId,
        categoria: modalEditar.categoria,
        rol_arbitro: rolFaltante,
        monto: Number(nuevoRolMonto),
        viatico: 0,
      });
      setMensajeNuevoRol(t('mensajes.rolAgregado', { rol: t(`roles.${rolFaltante}`) }));
      setNuevoRolMonto('');
      cargarTarifas(campeonatoId);
    } catch (err) {
      setErrorNuevoRol(err.response?.data?.error || t('mensajes.errorAgregarRol'));
    }
  }

  async function confirmarEliminarTarifa() {
    setErrorEliminar(null);
    try {
      await api.delete(`/tarifas/${confirmarEliminar.id}`);
      setConfirmarEliminar(null);
      cargarTarifas(campeonatoId);
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || t('mensajes.errorEliminar'));
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900 mb-4">{t('titulo')}</h1>
      <div className="mb-3 flex items-end flex-wrap gap-3 max-w-2xl">
        <div className="flex-1 max-w-sm">
          <label className="block text-xs text-gray-600 mb-1">{t('campos.filtrarCampeonato')}</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            value={campeonatoId}
            onChange={(e) => cargarTarifas(e.target.value)}
          >
            <option value="">{t('campos.seleccionaCampeonato')}</option>
            {campeonatos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!campeonatoId}
          onClick={abrirNuevaCategoria}
          className="px-3 py-1.5 rounded text-sm font-medium text-white bg-pitch-green hover:bg-pitch-green-dark disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {t('nuevaCategoria')}
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto max-w-2xl">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-left">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.categoria')}</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.rol')}</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.monto')}</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map((tarifa) => (
              <tr key={tarifa.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                <td className="px-4 py-2.5 capitalize">{tarifa.categoria}</td>
                <td className="px-4 py-2.5 capitalize">{t(`roles.${tarifa.rol_arbitro}`)}</td>
                <td className="px-4 py-2.5 tabular-nums font-medium text-navy-900">${tarifa.monto}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-3">
                    <button onClick={() => abrirEditar(tarifa)} title={t('common:acciones.editar')} className="text-navy-600 hover:text-navy-900">
                      <IconEdit size={16} />
                    </button>
                    <button
                      onClick={() => { setErrorEliminar(null); setConfirmarEliminar({ id: tarifa.id, etiqueta: `${tarifa.categoria} · ${t(`roles.${tarifa.rol_arbitro}`)}` }); }}
                      title={t('common:acciones.eliminar')}
                      className="text-gray-400 hover:text-card-red"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tarifas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                  {campeonatoId ? t('vacio.sinTarifas') : t('vacio.sinCampeonato')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: crear categoría nueva (siempre arranca en "central") */}
      {modalNueva && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-1">{t('modal.nuevaCategoria.titulo')}</h3>
            <p className="text-xs text-gray-500 mb-4">
              {t('modal.nuevaCategoria.textoPre')} <strong>{t('roles.central')}</strong>{t('modal.nuevaCategoria.textoPost')}
            </p>
            <form onSubmit={crearCategoria} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('modal.nuevaCategoria.nombreCategoria')}</label>
                <input
                  autoFocus required
                  placeholder={t('modal.nuevaCategoria.nombreCategoriaPlaceholder')}
                  value={modalNueva.categoria}
                  onChange={(e) => setModalNueva({ ...modalNueva, categoria: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('modal.nuevaCategoria.montoCentral')}</label>
                <input
                  type="number" step="0.01" min="0.01" required
                  value={modalNueva.monto}
                  onChange={(e) => setModalNueva({ ...modalNueva, monto: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              {errorNueva && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded">{errorNueva}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalNueva(null)}
                  className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  {t('common:acciones.cancelar')}
                </button>
                <button className="px-3 py-1.5 rounded text-sm font-medium text-white bg-navy-900 hover:bg-navy-800">
                  {t('modal.nuevaCategoria.boton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: editar tarifa (categoría y rol fijos; solo el monto cambia) */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-4">{t('modal.editar.titulo')}</h3>
            <form onSubmit={guardarEdicion} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('modal.editar.categoria')}</label>
                <input
                  disabled
                  value={modalEditar.categoria}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed capitalize"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('modal.editar.rol')}</label>
                <input
                  disabled
                  value={t(`roles.${modalEditar.rol_arbitro}`)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('modal.editar.monto')}</label>
                <input
                  type="number" step="0.01" min="0.01" required
                  value={modalEditar.monto}
                  onChange={(e) => setModalEditar({ ...modalEditar, monto: e.target.value })}
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
                  {t('common:acciones.cancelar')}
                </button>
                <button className="px-3 py-1.5 rounded text-sm font-medium text-white bg-navy-900 hover:bg-navy-800">
                  {t('common:acciones.guardarCambios')}
                </button>
              </div>
            </form>

            {(() => {
              const rolFaltante = ROLES.find(
                (r) => !tarifas.some((t) => t.categoria === modalEditar.categoria && t.rol_arbitro === r)
              );
              if (!rolFaltante) return null;
              const etiqueta = t(`roles.${rolFaltante}`);
              return (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-navy-700 mb-2">
                    {t('modal.editar.faltaTarifaPre', { categoria: modalEditar.categoria })} <strong>{etiqueta}</strong>{t('modal.editar.faltaTarifaPost')}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number" step="0.01" min="0.01"
                      placeholder={t('modal.editar.montoParaPlaceholder', { rol: etiqueta })}
                      value={nuevoRolMonto}
                      onChange={(e) => setNuevoRolMonto(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                    <button
                      type="button"
                      disabled={!nuevoRolMonto || Number(nuevoRolMonto) <= 0}
                      onClick={() => agregarRolFaltante(rolFaltante)}
                      className="px-3 py-1.5 rounded text-sm font-medium text-white bg-pitch-green hover:bg-pitch-green-dark disabled:opacity-50 whitespace-nowrap"
                    >
                      {t('modal.editar.agregar')}
                    </button>
                  </div>
                  {errorNuevoRol && <p className="text-xs text-card-red-dark bg-card-red/10 px-2 py-1.5 rounded mt-2">{errorNuevoRol}</p>}
                  {mensajeNuevoRol && <p className="text-xs text-pitch-green-dark bg-pitch-green/10 px-2 py-1.5 rounded mt-2">{mensajeNuevoRol}</p>}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal: confirmar eliminación */}
      {confirmarEliminar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="font-display text-lg font-semibold text-navy-900 mb-2">
              ¿Eliminar la tarifa de {confirmarEliminar.etiqueta}?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Si intentas designar a alguien con esta combinación después de borrarla, el sistema
              volverá a pedirte que la configures.
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
                onClick={confirmarEliminarTarifa}
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
