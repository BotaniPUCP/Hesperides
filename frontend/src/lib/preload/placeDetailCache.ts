import type { PlaceDetail } from '@shared/types';
import { onWrite } from '@/lib/writeEvents';

/**
 * Fichas de lugar que piden las tarjetas de la cola de migración para ofrecer sus perspectivas.
 * Con el filtro instantáneo (SPEC-119) las tarjetas aparecen y desaparecen en cada letra; sin
 * esta caché, cada una volvería a pedir la misma ficha. Se vacía cuando se guarda algo en /places.
 */

const cache = new Map<string, Promise<PlaceDetail>>();

onWrite((path) => {
  if (/^\/places(\/|$|\?)/.test(path)) cache.clear();
});

export function cachedPlaceDetail(code: string, load: () => Promise<PlaceDetail>): Promise<PlaceDetail> {
  const known = cache.get(code);
  if (known) return known;
  const pending = load().catch((error: unknown) => {
    cache.delete(code);
    throw error;
  });
  cache.set(code, pending);
  return pending;
}

export function clearPlaceDetailCache(): void {
  cache.clear();
}
