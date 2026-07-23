import { useEffect, useState } from 'react';
import api from '../api/client';
import TarjetaEstado from '../components/TarjetaEstado';

export default function MisDesignaciones() {
  const [designaciones, setDesignaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/arbitros/me').then((res) => {
      api.get(`/designaciones/arbitro/${res.data.id}`).then((r) => {
        setDesignaciones(r.data);
        setCargando(false);
      });
    });
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900 mb-5">Mis designaciones</h1>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-left">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fecha</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Hora</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Cancha</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Rol</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody>
            {designaciones.map((d) => (
              <tr key={d.id} className="border-t border-gray-100 hover:bg-navy-50/40">
                <td className="px-4 py-2.5">{d.fecha?.slice(0, 10)}</td>
                <td className="px-4 py-2.5 tabular-nums">{d.hora}</td>
                <td className="px-4 py-2.5">{d.cancha}</td>
                <td className="px-4 py-2.5 capitalize">{d.rol_designacion}</td>
                <td className="px-4 py-2.5"><TarjetaEstado estado={d.estado} /></td>
              </tr>
            ))}
            {designaciones.length === 0 && !cargando && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Aún no tienes designaciones
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
