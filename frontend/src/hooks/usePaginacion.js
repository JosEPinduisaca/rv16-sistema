import { useEffect, useState } from 'react';

const POR_PAGINA_DEFECTO = 10;

// Pagina un arreglo ya cargado en el cliente (no hay paginación en el
// backend). Si la lista se achica (ej. tras eliminar un registro) y la
// página actual queda fuera de rango, retrocede automáticamente.
export default function usePaginacion(lista, porPagina = POR_PAGINA_DEFECTO) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const inicio = (pagina - 1) * porPagina;
  const paginaActual = lista.slice(inicio, inicio + porPagina);

  return { pagina, setPagina, totalPaginas, paginaActual };
}
