import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { IconLoader2 } from '@tabler/icons-react';
import { suscribirCarga, hayCargaActiva } from '../api/cargaGlobal';

// Pequeño retraso antes de mostrar el overlay: evita el parpadeo cuando una
// petición responde casi al instante, sin dejar de bloquear la pantalla en
// cualquier llamada que sí tome un momento.
const RETRASO_MOSTRAR_MS = 150;

export default function BloqueoPantalla() {
  const { t } = useTranslation('common');
  const activo = useSyncExternalStore(suscribirCarga, hayCargaActiva);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!activo) {
      setVisible(false);
      return;
    }
    const temporizador = setTimeout(() => setVisible(true), RETRASO_MOSTRAR_MS);
    return () => clearTimeout(temporizador);
  }, [activo]);

  if (!visible) return null;

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
