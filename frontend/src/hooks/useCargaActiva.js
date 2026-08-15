import { useSyncExternalStore } from 'react';
import { suscribirCarga, hayCargaActiva } from '../api/cargaGlobal';

// true mientras haya al menos una petición a la API en curso (el mismo
// contador que alimenta el overlay de bloqueo global). Las páginas lo usan
// para deshabilitar sus botones de acción mientras dura la transacción.
export default function useCargaActiva() {
  return useSyncExternalStore(suscribirCarga, hayCargaActiva);
}
