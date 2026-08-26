// Validaciones reutilizables para los distintos controladores.

// Valida una cédula ecuatoriana con el algoritmo oficial (módulo 10).
function validarCedulaEcuatoriana(cedula) {
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

// Email con formato básico válido.
function validarEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Teléfono ecuatoriano: 7 a 10 dígitos (fijo o celular), opcional.
function validarTelefono(telefono) {
  if (!telefono) return true;
  return /^\d{7,10}$/.test(telefono);
}

// Nombres/apellidos: solo letras (incluye tildes, ñ, espacios).
function soloLetras(texto) {
  return typeof texto === 'string' && /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(texto.trim());
}

// Un texto no vacío (ni solo espacios), con longitud mínima configurable.
function textoValido(valor, minLength = 2) {
  return typeof valor === 'string' && valor.trim().length >= minLength;
}

// Nombre de categoría de tarifa (ej. "Senior", "Sub 15", "Categoría A"):
// letras, números y espacios, entre 2 y 40 caracteres.
function categoriaValida(texto) {
  return typeof texto === 'string' && /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9\s]{2,40}$/.test(texto.trim());
}

// Un monto monetario estrictamente positivo (mayor a cero).
function esMontoPositivo(valor) {
  const n = Number(valor);
  return !Number.isNaN(n) && n > 0;
}

module.exports = {
  validarCedulaEcuatoriana,
  validarEmail,
  validarTelefono,
  soloLetras,
  textoValido,
  categoriaValida,
  esMontoPositivo,
};
