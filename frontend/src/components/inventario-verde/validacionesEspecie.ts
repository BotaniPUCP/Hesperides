/**
 * Validaciones y normalizaciones para entidades del catálogo botánico e inventario verde.
 */

const MARCADORES = new Set(['sp.', 'spp.', 'subsp.', 'var.']);

const espaciosYNfc = (nombre: string) => nombre.normalize('NFC').replace(/\s+/gu, ' ').trim();

function esLetra(caracter: string): boolean {
  return /^\p{L}$/u.test(caracter);
}

function esMarca(caracter: string): boolean {
  return /^\p{M}$/u.test(caracter);
}

function esPalabraPermitida(token: string): boolean {
  const caracteres = Array.from(token);
  let segmentoTieneLetra = false;
  let guionAnterior = false;

  for (let i = 0; i < caracteres.length; i += 1) {
    const caracter = caracteres[i];
    if (esLetra(caracter)) {
      segmentoTieneLetra = true;
      guionAnterior = false;
    } else if (esMarca(caracter)) {
      if (!segmentoTieneLetra || guionAnterior) return false;
    } else if (caracter === '-') {
      if (!segmentoTieneLetra || guionAnterior || i === caracteres.length - 1) return false;
      segmentoTieneLetra = false;
      guionAnterior = true;
    } else {
      return false;
    }
  }

  return segmentoTieneLetra && !guionAnterior;
}

function esMarcador(token: string): boolean {
  return MARCADORES.has(token.toLowerCase());
}

function capitalizarPrimeraLetra(token: string): string {
  const minusculas = token.toLowerCase();
  const caracteres = Array.from(minusculas);
  const indice = caracteres.findIndex(esLetra);
  if (indice < 0) return minusculas;
  caracteres[indice] = caracteres[indice].toUpperCase();
  return caracteres.join('');
}

function errorDeFormato(token: string): boolean {
  const tokens = token.split(' ');
  let cruces = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const parte = tokens[i];
    if (parte === '×') {
      cruces += 1;
      if (i === tokens.length - 1) return true;
    } else if (parte.includes('×') || (!esMarcador(parte) && !esPalabraPermitida(parte))) {
      return true;
    }
  }
  return cruces > 1;
}

/** Valida caracteres y formato; no verifica la identidad taxonómica. */
export function validarNombreCientifico(nombre: string): string | null {
  const limpio = espaciosYNfc(nombre);
  if (!limpio) {
    return 'El nombre científico es obligatorio';
  }
  const normalizado = normalizarNombreCientifico(limpio);
  const longitud = Array.from(normalizado).length;
  if (longitud < 2) {
    return 'Debe tener al menos 2 caracteres';
  }
  if (longitud > 150) {
    return 'No puede exceder 150 caracteres';
  }
  if (errorDeFormato(limpio)) {
    return 'Usa letras, espacios, guiones internos, × o los marcadores sp., spp., subsp. y var.; no se permiten números, barras ni otros símbolos';
  }
  return null;
}

/**
 * Normaliza un nombre científico:
 * - Normaliza Unicode a NFC y los espacios.
 * - Capitaliza la primera palabra y deja en minúscula las posteriores.
 * - Conserva × y mantiene en minúscula los marcadores botánicos admitidos.
 */
export function normalizarNombreCientifico(nombre: string): string {
  const limpio = espaciosYNfc(nombre);
  if (!limpio) return '';
  const palabras = limpio.split(' ');
  const primeraPalabra = palabras[0] === '×' ? 1 : 0;
  return palabras.map((palabra, indice) => {
    if (palabra === '×' || esMarcador(palabra)) return palabra.toLowerCase();
    return indice === primeraPalabra ? capitalizarPrimeraLetra(palabra) : palabra.toLowerCase();
  }).join(' ');
}
