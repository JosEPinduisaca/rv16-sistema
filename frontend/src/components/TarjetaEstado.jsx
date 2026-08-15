import { useTranslation } from 'react-i18next';

// Insignia de estado con la proporción de una tarjeta de árbitro (3:4).
// El color codifica el estado: verde = confirmado/ok, amarillo = pendiente/atención,
// rojo = bloqueado/cancelado, azul = informativo.

const ESTILOS = {
  verde: 'bg-pitch-green text-white',
  amarillo: 'bg-card-yellow text-card-yellow-dark',
  rojo: 'bg-card-red text-white',
  azul: 'bg-navy-600 text-white',
  gris: 'bg-gray-200 text-gray-600',
};

const MAPA_ESTADOS = {
  programado: 'gris',
  designado: 'amarillo',
  publicado: 'verde',
  jugado: 'azul',
  cancelado: 'rojo',
  propuesta: 'amarillo',
  confirmada: 'azul',
  publicada: 'verde',
  pendiente: 'amarillo',
  aprobado: 'verde',
  rechazado: 'rojo',
  descontado: 'azul',
  generada: 'amarillo',
  aceptada: 'azul',
  observada: 'rojo',
  pagada: 'verde',
  activo: 'verde',
  desactivado: 'rojo',
  si: 'verde',
  no: 'rojo',
};

export default function TarjetaEstado({ estado, children }) {
  const { t } = useTranslation('estados');
  const color = MAPA_ESTADOS[estado] || 'gris';
  const etiqueta = children || t(estado, { defaultValue: estado });
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${ESTILOS[color]}`}
    >
      {etiqueta}
    </span>
  );
}
