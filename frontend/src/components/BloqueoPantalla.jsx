import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { IconLoader2 } from '@tabler/icons-react';
import { suscribirCarga, hayCargaActiva } from '../api/cargaGlobal';

export default function BloqueoPantalla() {
  const { t } = useTranslation('common');
  const activo = useSyncExternalStore(suscribirCarga, hayCargaActiva);

  if (!activo) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-navy-950/30 flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={t('estado.cargando')}
    >
      <div className="bg-white rounded-lg shadow-xl px-5 py-4 flex items-center gap-3">
        <IconLoader2 size={20} className="animate-spin text-navy-600" />
        <span className="text-sm font-medium text-navy-900">{t('estado.cargando')}</span>
      </div>
    </div>
  );
}
