const MAXIMO_POR_LINEA = 85;

/** Parte el texto en una o dos líneas, en el espacio que las deja más parejas. */
export function partirEnLineas(texto: string, maximo = MAXIMO_POR_LINEA): string[] {
  if (texto.length <= maximo) return [texto];

  const palabras = texto.split(' ');
  let mejor: [string, string] = [texto, ''];
  let menorDiferencia = Infinity;
  for (let corte = 1; corte < palabras.length; corte++) {
    const primera = palabras.slice(0, corte).join(' ');
    const segunda = palabras.slice(corte).join(' ');
    const diferencia = Math.abs(primera.length - segunda.length);
    if (diferencia < menorDiferencia) {
      menorDiferencia = diferencia;
      mejor = [primera, segunda];
    }
  }
  return mejor;
}
