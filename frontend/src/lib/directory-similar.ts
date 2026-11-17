/**
 * El «similar» del Directorio calculado en el cliente: espejo de pg_trgm y de la
 * función SQL `directory_key` (V036), para que el catálogo precargado responda
 * igual que `GET /directory/organizations/similar` sin llamar al backend.
 */
import type { ContactCatalogEntry, ContactSummary, OrganizationCatalogEntry, OrganizationSuggestion } from '@shared/types';

/** Igual que el backend (DirectoryText): pg_trgm, de 0 a 1. */
const SIMILARITY_THRESHOLD = 0.4;
const MAX_SUGGESTIONS = 5;

/** lower + sin tildes + sin espacios a los lados, como `directory_key(text)` en Postgres. */
export function directoryKey(text: string): string {
  return text.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Multiset de trigramas, como pg_trgm: rellena con dos espacios a cada lado y cuenta repeticiones. */
function trigrams(text: string): Map<string, number> {
  const collapsed = text.replace(/[^\p{L}\p{N}]+/gu, ' ');
  const padded = `  ${collapsed}  `;
  const counts = new Map<string, number>();
  for (let i = 0; i + 3 <= padded.length; i++) {
    const gram = padded.slice(i, i + 3);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

/**
 * pg_trgm `similarity(a, b)`: trigramas compartidos sobre el total de la unión.
 * Se sobre trigramas repetidos: cada aparición se empareja una sola vez.
 */
export function similarity(a: string, b: string): number {
  const left = trigrams(a);
  const right = trigrams(b);
  let matched = 0;
  for (const [gram, count] of left) matched += Math.min(count, right.get(gram) ?? 0);
  let total = 0;
  for (const count of left.values()) total += count;
  for (const count of right.values()) total += count;
  return total === 0 ? 0 : matched / (total - matched);
}

/**
 * pg_trgm `word_similarity(text, words)`: lo más parecido entre los trigramas de
 * `text` y cualquier tramo de palabras completas de `words`.
 */
export function wordSimilarity(text: string, words: string): number {
  const parts = words.split(' ').filter((w) => w !== '');
  if (parts.length === 0) return 0;
  let best = 0;
  for (let start = 0; start < parts.length; start++) {
    for (let end = start; end < parts.length; end++) {
      best = Math.max(best, similarity(text, parts.slice(start, end + 1).join(' ')));
    }
  }
  return best;
}

/** Lo que el backend hace por cada organización: max(similarity, word_similarity, similarity con cada alias). */
function similarityOf(entry: OrganizationCatalogEntry, key: string): number {
  const name = directoryKey(entry.name);
  let best = Math.max(similarity(key, name), wordSimilarity(key, name));
  for (const alias of entry.aliases) {
    // Con los alias el backend solo usa `similarity`, sin la de palabra.
    best = Math.max(best, similarity(key, directoryKey(alias)));
  }
  return best;
}

/**
 * Los parecidos de un nombre entre el catálogo: mismo contrato que el endpoint
 * `/similar` — umbral 0.4, a lo más 5, del más parecido al menos.
 */
export function findSimilarOrganizations(entries: readonly OrganizationCatalogEntry[], name: string,
    excludeCode?: string): OrganizationSuggestion[] {
  const key = directoryKey(name);
  if (key === '') return [];
  return entries
    .filter((e) => e.code !== excludeCode)
    .map((e) => ({ entry: e, sim: similarityOf(e, key) }))
    .filter(({ sim }) => sim >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.sim - a.sim || a.entry.name.localeCompare(b.entry.name, 'es'))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ entry }) => ({ code: entry.code, name: entry.name }));
}

/** El filtro de la lista (`q`): lo que contenga el código, el nombre o un alias, sin tildes ni mayúsculas. */
export function matchesSearch(entry: OrganizationCatalogEntry, search: string): boolean {
  const key = directoryKey(search);
  if (key === '') return true;
  const haystack = directoryKey([entry.code, entry.name, ...entry.aliases].join(' '));
  return haystack.includes(key);
}

/** Parecidos de un contacto: como el backend, solo el nombre completo, sin alias. */
export function findSimilarContacts(entries: readonly ContactCatalogEntry[], fullName: string): ContactSummary[] {
  const key = directoryKey(fullName);
  if (key === '') return [];
  return entries
    .map((c) => ({ entry: c, sim: Math.max(similarity(key, directoryKey(c.fullName)),
        wordSimilarity(key, directoryKey(c.fullName))) }))
    .filter(({ sim }) => sim >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.sim - a.sim || a.entry.fullName.localeCompare(b.entry.fullName, 'es'))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ entry }) => ({ code: entry.code, fullName: entry.fullName, extension: entry.extension,
        mobile: entry.mobile, email: entry.email, organizations: entry.organizations }));
}

/**
 * El filtro de la lista (`q`) sobre contactos: lo que contenga el código, el
 * nombre, el correo o los teléfonos, sin tildes ni mayúsculas.
 */
export function matchesContactSearch(entry: ContactCatalogEntry, search: string): boolean {
  const key = directoryKey(search);
  if (key === '') return true;
  const haystack = directoryKey([entry.code, entry.fullName, entry.email ?? '', entry.extension ?? '',
      entry.mobile ?? ''].join(' '));
  return haystack.includes(key);
}
