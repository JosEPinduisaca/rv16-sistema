// Antes de dejar de anteponer "Cancha " al guardar el campo `cancha`, muchos
// encuentros ya creados quedaron con ese prefijo delante del nombre del
// campeonato (ej. "Cancha Pintag"). Esto lo limpia al mostrarlo, sin tener
// que migrar los datos ya existentes en la base.
export function nombreCancha(cancha) {
  if (typeof cancha !== 'string') return cancha;
  return cancha.replace(/^cancha\s+/i, '');
}

// Fecha de hoy/mañana en formato "AAAA-MM-DD", en hora local (no UTC), para
// los atajos rápidos "HOY"/"MAÑANA" de los filtros de designación.
export function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function mananaISO() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  return fecha.toISOString().slice(0, 10);
}
