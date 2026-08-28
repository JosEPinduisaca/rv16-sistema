// Antes de dejar de anteponer "Cancha " al guardar el campo `cancha`, muchos
// encuentros ya creados quedaron con ese prefijo delante del nombre del
// campeonato (ej. "Cancha Pintag"). Esto lo limpia al mostrarlo, sin tener
// que migrar los datos ya existentes en la base.
export function nombreCancha(cancha) {
  if (typeof cancha !== 'string') return cancha;
  return cancha.replace(/^cancha\s+/i, '');
}
