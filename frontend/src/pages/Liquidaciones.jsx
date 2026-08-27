import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import usePaginacion from '../hooks/usePaginacion';
import Paginador from '../components/Paginador';
import TarjetaEstado from '../components/TarjetaEstado';

const ETIQUETA_RESPUESTA = {
  pendiente: { clave: 'respuesta.pendiente', clase: 'text-gray-400' },
  aceptada: { clave: 'respuesta.aceptada', clase: 'text-pitch-green-dark font-medium' },
  rechazada: { clave: 'respuesta.rechazada', clase: 'text-card-red-dark font-medium' },
};

export default function Liquidaciones() {
  const { t } = useTranslation(['liquidaciones', 'common']);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  useEffect(() => {
    api.get('/liquidaciones').then((res) => setLiquidaciones(res.data));
  }, []);

  const liquidacionesFiltradas = liquidaciones.filter((l) => {
    const coincideNombre = `${l.nombres} ${l.apellidos}`.toLowerCase().includes(busqueda.toLowerCase());
    const coincidePeriodo = !filtroPeriodo || l.periodo === filtroPeriodo;
    const coincideDesde = !filtroDesde || l.fecha_inicio?.slice(0, 10) >= filtroDesde;
    const coincideHasta = !filtroHasta || l.fecha_fin?.slice(0, 10) <= filtroHasta;
    return coincideNombre && coincidePeriodo && coincideDesde && coincideHasta;
  });
  const { pagina, setPagina, totalPaginas, paginaActual: liquidacionesPagina } = usePaginacion(liquidacionesFiltradas);

  function cambiarBusqueda(valor) {
    setBusqueda(valor);
    setPagina(1);
  }

  function cambiarFiltroPeriodo(valor) {
    setFiltroPeriodo(valor);
    setPagina(1);
  }

  function cambiarFiltroDesde(valor) {
    setFiltroDesde(valor);
    setPagina(1);
  }

  function cambiarFiltroHasta(valor) {
    setFiltroHasta(valor);
    setPagina(1);
  }

  function limpiarFiltros() {
    setBusqueda('');
    setFiltroPeriodo('');
    setFiltroDesde('');
    setFiltroHasta('');
    setPagina(1);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900 mb-4">{t('titulo')}</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="max-w-xs">
          <label className="block text-xs text-gray-600 mb-1">{t('filtros.buscarArbitro')}</label>
          <input
            type="text"
            placeholder={t('filtros.buscarPlaceholder')}
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">{t('filtros.periodo')}</label>
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
            {[
              { value: '', label: t('filtros.todos') },
              { value: 'quincenal', label: t('filtros.quincenal') },
              { value: 'mensual', label: t('filtros.mensual') },
            ].map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => cambiarFiltroPeriodo(op.value)}
                className={`px-3 py-1.5 font-medium transition ${
                  filtroPeriodo === op.value ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">{t('filtros.desde')}</label>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => cambiarFiltroDesde(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">{t('filtros.hasta')}</label>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => cambiarFiltroHasta(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        {(busqueda || filtroPeriodo || filtroDesde || filtroHasta) && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs text-navy-600 hover:underline mb-1.5"
          >
            {t('filtros.limpiar')}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-left">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.arbitro')}</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.periodo')}</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.rango')}</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.neto')}</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.estado')}</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{t('columnas.respuestaArbitro')}</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {liquidacionesPagina.map((l) => (
              <tr key={l.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                <td className="px-4 py-2.5 font-medium text-navy-900 whitespace-nowrap">{l.nombres} {l.apellidos}</td>
                <td className="px-4 py-2.5 capitalize">{l.periodo}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                  {l.fecha_inicio?.slice(0, 10)} → {l.fecha_fin?.slice(0, 10)}
                </td>
                <td className="px-4 py-2.5 tabular-nums font-semibold text-navy-900">${l.monto_neto}</td>
                <td className="px-4 py-2.5"><TarjetaEstado estado={l.estado} /></td>
                <td className="px-4 py-2.5 text-xs">
                  <span className={(ETIQUETA_RESPUESTA[l.respuesta_arbitro] || ETIQUETA_RESPUESTA.pendiente).clase}>
                    {t((ETIQUETA_RESPUESTA[l.respuesta_arbitro] || ETIQUETA_RESPUESTA.pendiente).clave)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <Link to={`/liquidaciones/${l.id}`} className="text-navy-600 hover:text-navy-900 hover:underline text-xs font-medium whitespace-nowrap">
                    {t('common:acciones.verDetalle')}
                  </Link>
                </td>
              </tr>
            ))}
            {liquidacionesFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                  {(busqueda || filtroPeriodo || filtroDesde || filtroHasta) ? t('vacio.conFiltros') : t('vacio.sinFiltros')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
    </div>
  );
}
