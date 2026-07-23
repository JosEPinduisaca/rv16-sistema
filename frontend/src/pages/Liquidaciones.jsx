import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import TarjetaEstado from '../components/TarjetaEstado';

const ETIQUETA_RESPUESTA = {
  pendiente: { texto: 'Sin responder', clase: 'text-gray-400' },
  aceptada: { texto: '✓ Aceptada', clase: 'text-pitch-green-dark font-medium' },
  rechazada: { texto: '✗ Desacuerdo', clase: 'text-card-red-dark font-medium' },
};

export default function Liquidaciones() {
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

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900 mb-4">Liquidaciones</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="max-w-xs">
          <label className="block text-xs text-gray-600 mb-1">Buscar árbitro</label>
          <input
            type="text"
            placeholder="Por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Período</label>
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
            {[
              { value: '', label: 'Todos' },
              { value: 'quincenal', label: 'Quincenal' },
              { value: 'mensual', label: 'Mensual' },
            ].map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => setFiltroPeriodo(op.value)}
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
          <label className="block text-xs text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        {(busqueda || filtroPeriodo || filtroDesde || filtroHasta) && (
          <button
            type="button"
            onClick={() => { setBusqueda(''); setFiltroPeriodo(''); setFiltroDesde(''); setFiltroHasta(''); }}
            className="text-xs text-navy-600 hover:underline mb-1.5"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-left">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Árbitro</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Período</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Rango</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Bruto</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Adelantos</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Neto</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Respuesta árbitro</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {liquidacionesFiltradas.map((l) => (
              <tr key={l.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                <td className="px-4 py-2.5 font-medium text-navy-900 whitespace-nowrap">{l.nombres} {l.apellidos}</td>
                <td className="px-4 py-2.5 capitalize">{l.periodo}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                  {l.fecha_inicio?.slice(0, 10)} → {l.fecha_fin?.slice(0, 10)}
                </td>
                <td className="px-4 py-2.5 tabular-nums">${l.monto_bruto}</td>
                <td className="px-4 py-2.5 tabular-nums text-card-red-dark">-${l.total_adelantos}</td>
                <td className="px-4 py-2.5 tabular-nums font-semibold text-navy-900">${l.monto_neto}</td>
                <td className="px-4 py-2.5"><TarjetaEstado estado={l.estado} /></td>
                <td className="px-4 py-2.5 text-xs">
                  <span className={(ETIQUETA_RESPUESTA[l.respuesta_arbitro] || ETIQUETA_RESPUESTA.pendiente).clase}>
                    {(ETIQUETA_RESPUESTA[l.respuesta_arbitro] || ETIQUETA_RESPUESTA.pendiente).texto}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <Link to={`/liquidaciones/${l.id}`} className="text-navy-600 hover:text-navy-900 hover:underline text-xs font-medium whitespace-nowrap">
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
            {liquidacionesFiltradas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                  {(busqueda || filtroPeriodo || filtroDesde || filtroHasta) ? 'Ningún resultado coincide con esos filtros' : 'Aún no hay liquidaciones generadas'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
