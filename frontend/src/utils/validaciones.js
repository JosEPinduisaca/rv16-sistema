// Espejo de backend/src/utils/validaciones.js: mismas reglas, para dar
// feedback inmediato en el formulario sin esperar la respuesta del servidor.
// El backend sigue siendo la fuente de verdad y revalida todo igual.

export function validarCedulaEcuatoriana(cedula) {
  if (typeof cedula !== 'string' || !/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provincia = parseInt(cedula.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) {
    return false;
  }

  const tercerDigito = parseInt(cedula[2], 10);
  if (tercerDigito > 6) {
    return false;
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula[i], 10) * coeficientes[i];
    if (valor > 9) valor -= 9;
    suma += valor;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === parseInt(cedula[9], 10);
}

export function validarEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validarTelefono(telefono) {
  if (!telefono) return true;
  return /^\d{7,10}$/.test(telefono);
}

export function soloLetras(texto) {
  return typeof texto === 'string' && /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(texto.trim());
}

export function textoValido(valor, minLength = 2) {
  return typeof valor === 'string' && valor.trim().length >= minLength;
}

export function categoriaValida(texto) {
  return typeof texto === 'string' && /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9\s]{2,40}$/.test(texto.trim());
}

export function esMontoPositivo(valor) {
  const n = Number(valor);
  return !Number.isNaN(n) && n > 0;
}

export function esMontoNoNegativo(valor) {
  const n = Number(valor);
  return !Number.isNaN(n) && n >= 0;
}
