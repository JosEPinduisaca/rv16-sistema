import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  IconMenu2,
  IconX,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { IDIOMA_STORAGE_KEY } from '../i18n';

const ICONOS = {
  inicio: IconLayoutDashboard,
  arbitros: IconUsers,
  campeonatos: IconTrophy,
  tarifas: IconCash,
  encuentros: IconCalendarEvent,
  designaciones: IconClipboardCheck,
  misDesignaciones: IconClipboardCheck,
  designacionGeneral: IconListDetails,
  adelantos: IconReceipt2,
  liquidaciones: IconWallet,
  misFinanzas: IconWallet,
  miDisponibilidad: IconCalendarStats,
};

const enlacesPorRol = {
  administrador: [
    { to: '/', key: 'inicio' },
    { to: '/arbitros', key: 'arbitros' },
    { to: '/campeonatos', key: 'campeonatos' },
    { to: '/tarifas', key: 'tarifas' },
    { to: '/encuentros', key: 'encuentros' },
    { to: '/designaciones', key: 'designaciones' },
    { to: '/designacion-general', key: 'designacionGeneral' },
    { to: '/adelantos', key: 'adelantos' },
    { to: '/liquidaciones', key: 'liquidaciones' },
  ],
  directivo: [
    { to: '/', key: 'inicio' },
    { to: '/arbitros', key: 'arbitros' },
    { to: '/encuentros', key: 'encuentros' },
    { to: '/designaciones', key: 'designaciones' },
    { to: '/designacion-general', key: 'designacionGeneral' },
  ],
  arbitro: [
    { to: '/', key: 'inicio' },
    { to: '/mis-designaciones', key: 'misDesignaciones' },
    { to: '/designacion-general', key: 'designacionGeneral' },
    { to: '/mi-disponibilidad', key: 'miDisponibilidad' },
    { to: '/mis-finanzas', key: 'misFinanzas' },
  ],
};

export default function Layout() {
  const { t, i18n } = useTranslation('common');
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const enlaces = enlacesPorRol[usuario?.rol] || [];
  const [menuAbierto, setMenuAbierto] = useState(false);

  function cambiarIdioma(idioma) {
    i18n.changeLanguage(idioma);
    localStorage.setItem(IDIOMA_STORAGE_KEY, idioma);
  }

  function cerrarSesion() {
    logout();
    navigate('/login');
  }

  const iniciales = `${usuario?.nombres?.[0] || ''}${usuario?.apellidos?.[0] || ''}`.toUpperCase();

  return (
    <div className="min-h-screen flex bg-navy-50">
      {/* Fondo oscuro para cerrar el menú al tocar fuera, solo en móvil */}
      {menuAbierto && (
        <div
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      <aside
        className={`print:hidden fixed md:static inset-y-0 left-0 z-40 w-64 md:w-60 bg-navy-900 text-white flex flex-col shrink-0 transform transition-transform duration-200 ease-in-out ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo-rv16.png" alt="RV16" className="w-9 h-9 object-contain" />
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold tracking-wide">RV16</p>
              <p className="text-[10px] text-navy-500 uppercase tracking-wider">{t('app.eslogan')}</p>
            </div>
          </div>
          <button
            onClick={() => setMenuAbierto(false)}
            className="md:hidden text-navy-300 hover:text-white"
            aria-label={t('acciones.cerrarMenu')}
          >
            <IconX size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {enlaces.map((enlace) => {
            const activo = location.pathname === enlace.to;
            const Icono = ICONOS[enlace.key] || IconLayoutDashboard;
            return (
              <Link
                key={enlace.to}
                to={enlace.to}
                onClick={() => setMenuAbierto(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                  activo
                    ? 'bg-navy-700 text-white font-medium'
                    : 'text-navy-100/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icono size={18} stroke={1.75} />
                {t(`nav.${enlace.key}`)}
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

          <div className="inline-flex w-full rounded-md border border-white/15 overflow-hidden text-xs mb-2" role="group" aria-label={t('idioma.cambiar')}>
            {['es', 'en'].map((idioma) => (
              <button
                key={idioma}
                onClick={() => cambiarIdioma(idioma)}
                className={`flex-1 py-1.5 font-medium transition ${
                  i18n.resolvedLanguage === idioma ? 'bg-white/15 text-white' : 'text-navy-100/60 hover:bg-white/5'
                }`}
              >
                {t(`idioma.${idioma}`)}
              </button>
            ))}
          </div>

          <button
            onClick={cerrarSesion}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-navy-100/70 hover:bg-white/5 hover:text-white transition"
          >
            <IconLogout size={18} stroke={1.75} />
            {t('acciones.cerrarSesion')}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Barra superior solo en móvil/tablet, con botón para abrir el menú */}
        <div className="print:hidden md:hidden flex items-center gap-3 bg-navy-900 text-white px-4 py-3 sticky top-0 z-20">
          <button
            onClick={() => setMenuAbierto(true)}
            className="text-white shrink-0"
            aria-label={t('acciones.abrirMenu')}
          >
            <IconMenu2 size={22} />
          </button>
          <img src="/logo-rv16.png" alt="RV16" className="w-6 h-6 object-contain shrink-0" />
          <span className="font-display text-sm font-semibold tracking-wide truncate">
            RV16 · {t('app.eslogan')}
          </span>
        </div>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 print:max-w-none print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
