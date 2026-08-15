// Contador global de peticiones en curso, compartido entre el interceptor de
// Axios (que lo incrementa/decrementa) y el overlay que bloquea la pantalla
// mientras haya al menos una en vuelo. Vive fuera de React porque el
// interceptor de Axios no es un componente.
let contador = 0;
const listeners = new Set();

function notificar() {
  listeners.forEach((fn) => fn());
}

export function iniciarCarga() {
  contador += 1;
  notificar();
}

export function finalizarCarga() {
  contador = Math.max(0, contador - 1);
  notificar();
}

export function hayCargaActiva() {
  return contador > 0;
}

export function suscribirCarga(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
