import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconUsers,
  IconTrophy,
  IconCash,
  IconCalendarEvent,
  IconClipboardCheck,
  IconReceipt2,
  IconWallet,
  IconCalendarStats,
  IconListDetails,
  IconLogout,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

const ICONOS = {
  Inicio: IconLayoutDashboard,
  'Árbitros': IconUsers,
  Campeonatos: IconTrophy,
  Tarifas: IconCash,
  Encuentros: IconCalendarEvent,
  Designaciones: IconClipboardCheck,
  'Mis designaciones': IconClipboardCheck,
  'Designación general': IconListDetails,
  Adelantos: IconReceipt2,
  Liquidaciones: IconWallet,
  'Mis finanzas': IconWallet,
  'Mi disponibilidad': IconCalendarStats,
};

const enlacesPorRol = {
  administrador: [
    { to: '/', label: 'Inicio' },
    { to: '/arbitros', label: 'Árbitros' },
    { to: '/campeonatos', label: 'Campeonatos' },
    { to: '/tarifas', label: 'Tarifas' },
    { to: '/encuentros', label: 'Encuentros' },
    { to: '/designaciones', label: 'Designaciones' },
    { to: '/designacion-general', label: 'Designación general' },
    { to: '/adelantos', label: 'Adelantos' },
    { to: '/liquidaciones', label: 'Liquidaciones' },
  ],
  directivo: [
    { to: '/', label: 'Inicio' },
    { to: '/arbitros', label: 'Árbitros' },
    { to: '/encuentros', label: 'Encuentros' },
    { to: '/designaciones', label: 'Designaciones' },
    { to: '/designacion-general', label: 'Designación general' },
  ],
  arbitro: [
    { to: '/', label: 'Inicio' },
    { to: '/mis-designaciones', label: 'Mis designaciones' },
    { to: '/designacion-general', label: 'Designación general' },
    { to: '/mi-disponibilidad', label: 'Mi disponibilidad' },
    { to: '/mis-finanzas', label: 'Mis finanzas' },
  ],
};

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const enlaces = enlacesPorRol[usuario?.rol] || [];

  function cerrarSesion() {
    logout();
    navigate('/login');
  }

  const iniciales = `${usuario?.nombres?.[0] || ''}${usuario?.apellidos?.[0] || ''}`.toUpperCase();

  return (
    <div className="min-h-screen flex bg-navy-50">
      <aside className="w-60 bg-navy-900 text-white flex flex-col shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <img src="/logo-rv16.png" alt="RV16" className="w-9 h-9 object-contain" />
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold tracking-wide">RV16</p>
            <p className="text-[10px] text-navy-500 uppercase tracking-wider">Núcleo arbitral</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {enlaces.map((enlace) => {
            const activo = location.pathname === enlace.to;
            const Icono = ICONOS[enlace.label] || IconLayoutDashboard;
            return (
              <Link
                key={enlace.to}
                to={enlace.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                  activo
                    ? 'bg-navy-700 text-white font-medium'
                    : 'text-navy-100/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icono size={18} stroke={1.75} />
                {enlace.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-xs font-semibold shrink-0">
              {iniciales}
            </div>
            <div className="min-w-0">
              <p className="text-sm truncate">{usuario?.nombres}</p>
              <p className="text-[11px] text-navy-500 capitalize">{usuario?.rol}</p>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-navy-100/70 hover:bg-white/5 hover:text-white transition"
          >
            <IconLogout size={18} stroke={1.75} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <main className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
