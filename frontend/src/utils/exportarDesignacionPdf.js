import { nombreCancha } from './formato';

// Un color fijo por campeonato (mismo criterio que la paleta en pantalla),
// para que la línea de cada partido se identifique de un vistazo.
const COLOR_CAMPEONATO = ['#1b3d63', '#2e7d52', '#c2410c', '#0f766e', '#6d28d9', '#475569', '#7a1616'];
const ROJO = '#d93a3a';
const VERDE = '#2e7d52';
const AMARILLO = '#f2c230';
const NAVY = '#0f2a47';

function hexARgb(hex) {
  const limpio = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(limpio.substr(i, 2), 16));
}

function componenteHex(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

// Mezcla un color con blanco para obtener el mismo efecto que los fondos
// translúcidos de la pantalla (bg-color/10, /15, etc.), pero en un color
// sólido, ya que jsPDF no soporta opacidad de relleno de forma simple.
function tintar(hex, ratio) {
  const [r, g, b] = hexARgb(hex);
  const mr = r * ratio + 255 * (1 - ratio);
  const mg = g * ratio + 255 * (1 - ratio);
  const mb = b * ratio + 255 * (1 - ratio);
  return `#${componenteHex(mr)}${componenteHex(mg)}${componenteHex(mb)}`;
}

// Genera y descarga un PDF horizontal de una sola hoja con la designación
// completa: un panel de color por campeonato, con todos sus partidos
// siempre expandidos (a diferencia de la pantalla, que los colapsa).
// jsPDF es relativamente pesado y esta app no divide el bundle por ruta, así
// que se importa en el momento (no al inicio del archivo) para que solo se
// descargue cuando alguien realmente use el botón de exportar.
export async function exportarDesignacionPdf({ nombresGrupos, grupos, tituloDoc, nombreArchivo, arbitroResaltado, textoSinDesignar }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const margen = 8;
  const gapColumnas = 4;
  const gapPaneles = 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(NAVY);
  doc.text(tituloDoc, anchoPagina / 2, margen + 5, { align: 'center' });

  const areaArriba = margen + 12;
  const altoDisponible = altoPagina - areaArriba - margen;
  const anchoDisponible = anchoPagina - margen * 2;

  const total = nombresGrupos.length;
  const columnas = total <= 2 ? 1 : total <= 5 ? 2 : total <= 9 ? 3 : 4;
  const anchoColumna = (anchoDisponible - gapColumnas * (columnas - 1)) / columnas;

  const ALTO_ENCABEZADO_BASE = 6.5;
  const ALTO_FILA_BASE = 5.5;

  function alturaPanel(torneo, altoFila, altoEncabezado) {
    return altoEncabezado + grupos[torneo].length * altoFila;
  }

  // Reparte los campeonatos en columnas balanceando la altura acumulada
  // (los más "pesados" se van intercalando en la columna más corta).
  const alturasColumnas = new Array(columnas).fill(0);
  const gruposPorColumna = Array.from({ length: columnas }, () => []);
  nombresGrupos.forEach((torneo) => {
    let idxMin = 0;
    for (let i = 1; i < columnas; i++) {
      if (alturasColumnas[i] < alturasColumnas[idxMin]) idxMin = i;
    }
    gruposPorColumna[idxMin].push(torneo);
    alturasColumnas[idxMin] += alturaPanel(torneo, ALTO_FILA_BASE, ALTO_ENCABEZADO_BASE) + gapPaneles;
  });

  const alturaMaxima = Math.max(...alturasColumnas, 1);
  const escala = Math.min(1, altoDisponible / alturaMaxima);
  const altoFila = ALTO_FILA_BASE * escala;
  const altoEncabezado = ALTO_ENCABEZADO_BASE * escala;
  const fuenteEncabezado = Math.max(6.5, 9 * escala);
  const fuenteFila = Math.max(5.5, 7.5 * escala);

  gruposPorColumna.forEach((lista, colIdx) => {
    let y = areaArriba;
    const x = margen + colIdx * (anchoColumna + gapColumnas);

    lista.forEach((torneo) => {
      const color = COLOR_CAMPEONATO[nombresGrupos.indexOf(torneo) % COLOR_CAMPEONATO.length];
      const partidos = grupos[torneo];

      doc.setFillColor(color);
      doc.rect(x, y, anchoColumna, altoEncabezado, 'F');
      doc.setTextColor('#ffffff');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fuenteEncabezado);
      doc.text(torneo, x + 2, y + altoEncabezado / 2, { baseline: 'middle' });

      let yFila = y + altoEncabezado;
      partidos.forEach((p) => {
        const sinDesignar = p.designados.length === 0;
        const tieneResaltado = arbitroResaltado && p.designados.some((d) => String(d.arbitro_id) === String(arbitroResaltado));
        const fondo = tieneResaltado
          ? tintar(AMARILLO, 0.45)
          : tintar(sinDesignar ? ROJO : VERDE, 0.15);

        doc.setFillColor(fondo);
        doc.rect(x, yFila, anchoColumna, altoFila, 'F');
        doc.setDrawColor('#e5e7eb');
        doc.rect(x, yFila, anchoColumna, altoFila);

        const centroY = yFila + altoFila / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fuenteFila);
        doc.setTextColor(NAVY);
        doc.text((p.hora || '').slice(0, 5), x + 1.5, centroY, { baseline: 'middle' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#6b7280');
        const xCancha = x + 1.5 + 11;
        const cancha = nombreCancha(p.cancha) || '';
        const canchaCorta = doc.splitTextToSize(cancha, 22)[0] || '';
        doc.text(canchaCorta, xCancha, centroY, { baseline: 'middle' });

        const xDesignados = xCancha + 24;
        const anchoTextoDesignados = Math.max(10, anchoColumna - (xDesignados - x) - 16);
        const textoDesignados = sinDesignar
          ? textoSinDesignar
          : p.designados.map((d) => `${d.nombre} (${d.rol})`).join('; ');
        doc.setTextColor(sinDesignar ? '#9ca3af' : '#111827');
        doc.setFont('helvetica', sinDesignar ? 'italic' : 'normal');
        const lineaDesignados = doc.splitTextToSize(textoDesignados, anchoTextoDesignados)[0] || '';
        doc.text(lineaDesignados, xDesignados, centroY, { baseline: 'middle' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fuenteFila * 0.9);
        doc.setTextColor('#374151');
        doc.text(p.estado || '', x + anchoColumna - 1.5, centroY, { baseline: 'middle', align: 'right' });
        doc.setFontSize(fuenteFila);

        yFila += altoFila;
      });

      y += altoEncabezado + partidos.length * altoFila + gapPaneles;
    });
  });

  doc.save(nombreArchivo);
}
