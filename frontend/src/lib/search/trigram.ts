/**
 * `similarity` y `word_similarity` de pg_trgm, para avisar de parecidos sin consultar al
 * backend (SPEC-119 D-06). Deben dar el mismo número que PostgreSQL: el umbral se fijó allí.
 */

const WORD = /[\p{L}\p{N}]+/gu;

/** Trigramas en orden, con repetidos: cada palabra se rellena con dos espacios antes y uno después. */
function orderedTrigrams(text: string): string[] {
  const result: string[] = [];
  for (const word of text.toLowerCase().match(WORD) ?? []) {
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i++) result.push(padded.slice(i, i + 3));
  }
  return result;
}

export function trigrams(text: string): Set<string> {
  return new Set(orderedTrigrams(text));
}

function ratio(shared: number, left: number, right: number): number {
  const union = left + right - shared;
  return union === 0 ? 0 : shared / union;
}

export function similarity(a: string, b: string): number {
  const left = trigrams(a);
  const right = trigrams(b);
  let shared = 0;
  for (const t of left) if (right.has(t)) shared++;
  return ratio(shared, left.size, right.size);
}

/**
 * El mayor parecido entre los trigramas de `a` y cualquier tramo continuo de los de `b`.
 * Se prueban todos los tramos: los nombres del Directorio son cortos y la lista cabe.
 */
export function wordSimilarity(a: string, b: string): number {
  const wanted = trigrams(a);
  const sequence = orderedTrigrams(b);
  let best = 0;
  for (let start = 0; start < sequence.length; start++) {
    const extent = new Set<string>();
    let shared = 0;
    for (let end = start; end < sequence.length; end++) {
      const t = sequence[end];
      if (!extent.has(t)) {
        extent.add(t);
        if (wanted.has(t)) shared++;
      }
      best = Math.max(best, ratio(shared, wanted.size, extent.size));
    }
  }
  return best;
}
