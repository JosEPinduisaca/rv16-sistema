import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconUsers, IconTrophy, IconCalendarEvent, IconClipboardCheck } from '@tabler/icons-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function TarjetaStat({ icono: Icono, etiqueta, valor, to }) {
  const contenido = (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-center gap-4 hover:border-navy-300 transition">
      <div className="w-11 h-11 rounded-md bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
        <Icono size={22} stroke={1.75} />
      </div>
      <div>
        <p className="font-display text-2xl font-semibold text-navy-900 leading-none">{valor}</p>
        <p className="text-xs text-gray-500 mt-1.5">{etiqueta}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{contenido}</Link> : contenido;
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState({ arbitros: 0, campeonatos: 0, encuentros: 0, pendientes: 0 });

  useEffect(() => {
    if (usuario?.rol === 'arbitro') return;

    Promise.all([
      api.get('/arbitros').catch(() => ({ data: [] })),
      api.get('/campeonatos').catch(() => ({ data: [] })),
      api.get('/encuentros').catch(() => ({ data: [] })),
    ]).then(([arb, camp, enc]) => {
      setStats({
        arbitros: arb.data.length,
        campeonatos: camp.data.length,
        encuentros: enc.data.length,
        pendientes: enc.data.filter((e) => e.estado === 'programado').length,
      });
    });
  }, [usuario]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900">
          Hola, {usuario?.nombres}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Sesión iniciada como <span className="capitalize font-medium text-navy-700">{usuario?.rol}</span>
        </p>
      </div>

      {usuario?.rol !== 'arbitro' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TarjetaStat icono={IconUsers} etiqueta="Árbitros registrados" valor={stats.arbitros} to="/arbitros" />
          <TarjetaStat icono={IconTrophy} etiqueta="Campeonatos activos" valor={stats.campeonatos} to="/campeonatos" />
          <TarjetaStat icono={IconCalendarEvent} etiqueta="Encuentros totales" valor={stats.encuentros} to="/encuentros" />
          <TarjetaStat icono={IconClipboardCheck} etiqueta="Sin designar" valor={stats.pendientes} to="/encuentros" />
        </div>
      )}

      {usuario?.rol === 'arbitro' && (
        <Link
          to="/mis-designaciones"
          className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-navy-300 transition"
        >
          <IconClipboardCheck size={20} className="text-navy-700" stroke={1.75} />
          <span className="text-sm font-medium text-navy-800">Ver mis designaciones</span>
        </Link>
      )}
    </div>
  );
}
