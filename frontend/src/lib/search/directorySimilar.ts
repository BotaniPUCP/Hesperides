import type { ContactSummary, OrganizationSuggestion, OrganizationSummary } from '@shared/types';
import { normalize } from './searchText';
import { similarity, wordSimilarity } from './trigram';

/**
 * Parecidos al registrar en el Directorio (SPEC-106 §3), calculados en el navegador con la lista
 * precargada (SPEC-119 D-06). Mismas fórmulas, umbral y tope que tenía el backend.
 */

/** Cuántas sugerencias se muestran antes de crear. */
const MAX_SUGGESTIONS = 5;
/** Parecido mínimo (de 0 a 1): por debajo, «EEGGCC» y «DAF» empezarían a sugerirse entre sí. */
const SIMILARITY_THRESHOLD = 0.4;

/** «derecho» casi no se parece a «Facultad de Derecho» entero, pero está contenido en él. */
function nameScore(name: string, text: string): number {
  const key = normalize(name);
  return Math.max(similarity(key, text), wordSimilarity(text, key));
}

function mostSimilar<T>(items: T[], text: string, score: (item: T, text: string) => number, nameOf: (item: T) => string): T[] {
  const wanted = normalize(text);
  if (wanted === '') return [];
  return items
    .map((item) => ({ item, score: score(item, wanted) }))
    .filter((s) => s.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score || nameOf(a.item).toLowerCase().localeCompare(nameOf(b.item).toLowerCase()))
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => s.item);
}

export function similarOrganizations(items: OrganizationSummary[], name: string): OrganizationSuggestion[] {
  const score = (o: OrganizationSummary, text: string) =>
    Math.max(nameScore(o.name, text), ...o.aliases.map((alias) => similarity(normalize(alias), text)));
  return mostSimilar(items, name, score, (o) => o.name).map(({ code, name: found }) => ({ code, name: found }));
}

/** De cualquier organización: así se descubre a alguien ya registrado en otra. */
export function similarContacts(items: ContactSummary[], fullName: string): ContactSummary[] {
  return mostSimilar(items, fullName, (c, text) => nameScore(c.fullName, text), (c) => c.fullName);
}
