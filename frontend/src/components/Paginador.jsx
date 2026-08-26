import { useTranslation } from 'react-i18next';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export default function Paginador({ pagina, totalPaginas, onCambiar }) {
  const { t } = useTranslation('common');

  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-3">
      <button
        type="button"
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina <= 1}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IconChevronLeft size={15} />
        {t('paginador.anterior')}
      </button>
      <span className="text-xs text-gray-500">{t('paginador.pagina', { actual: pagina, total: totalPaginas })}</span>
      <button
        type="button"
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina >= totalPaginas}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('paginador.siguiente')}
        <IconChevronRight size={15} />
      </button>
    </div>
  );
}
