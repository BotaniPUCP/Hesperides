'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CatalogItem } from '@shared/types';
import type { SelectOption } from '@/components/ui';
import { catalogsApi } from '@/lib/catalogs-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { CATALOG_CACHE_TTL_MS } from '@/lib/constants';

interface Entrada {
  items: CatalogItem[];
  fetchedAt: number;
}

/**
 * Caché a nivel de módulo, no de componente: dos desplegables montados en
 * pantallas distintas comparten la misma entrada, que es lo que evita repetir
 * la petición (CA-06). Vive mientras dure la pestaña; no se persiste porque un
 * catálogo cambiado por un administrador debe llegar al recargar.
 */
const cache = new Map<string, Entrada>();

/** Peticiones en curso, para que dos montajes simultáneos compartan una sola. */
const enVuelo = new Map<string, Promise<CatalogItem[]>>();

function estaVigente(entrada: Entrada): boolean {
  return Date.now() - entrada.fetchedAt < CATALOG_CACHE_TTL_MS;
}

async function pedir(typeCode: string): Promise<CatalogItem[]> {
  const yaEnCurso = enVuelo.get(typeCode);
  if (yaEnCurso) return yaEnCurso;

  const promesa = catalogsApi
    .activeItems(typeCode)
    .then((items) => {
      cache.set(typeCode, { items, fetchedAt: Date.now() });
      return items;
    })
    .finally(() => enVuelo.delete(typeCode));

  enVuelo.set(typeCode, promesa);
  return promesa;
}

/** Vacía la caché de un catálogo, o toda si no se indica cuál. */
export function invalidarCatalogo(typeCode?: string): void {
  if (typeCode) {
    cache.delete(typeCode);
  } else {
    cache.clear();
  }
}

export interface UseCatalogResult {
  items: CatalogItem[];
  isLoading: boolean;
  errorMessage: string | null;
}

/**
 * Los ítems activos de un catálogo, cacheados 5 minutos (SPEC-003 §6.2).
 *
 * Pasado el TTL la siguiente llamada revalida en segundo plano: devuelve de
 * inmediato lo cacheado y lo reemplaza cuando llega la respuesta. Por eso
 * `isLoading` solo es cierto cuando no hay nada que mostrar todavía — un
 * desplegable que ya tiene opciones no debe parpadear a "cargando" porque el
 * caché venció.
 */
export function useCatalog(typeCode: string): UseCatalogResult {
  // Lo que se ha recibido por red en este hook, con el catálogo al que
  // pertenece. Guardar el typeCode junto a los datos es lo que evita mostrar
  // por un render los ítems del catálogo anterior al cambiar de uno a otro.
  const [recibido, setRecibido] = useState<{ typeCode: string; items: CatalogItem[] } | null>(null);
  const [errorPorCatalogo, setErrorPorCatalogo] = useState<{ typeCode: string; mensaje: string } | null>(null);

  useEffect(() => {
    // typeCode vacio significa "todavia no se cual": lo usa quien solo necesita
    // el catalogo bajo una condicion, y pedirlo daria un 404 seguro.
    if (!typeCode) return;

    let vigente = true;
    const entrada = cache.get(typeCode);

    // Cacheado y fresco: no hay nada que pedir. El valor ya se deriva de la
    // caché más abajo, sin pasar por setState.
    if (entrada && estaVigente(entrada)) return;

    pedir(typeCode)
      .then((frescos) => {
        if (!vigente) return;
        setRecibido({ typeCode, items: frescos });
        setErrorPorCatalogo(null);
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        // Una revalidación fallida conserva lo que ya se mostraba: el
        // desplegable sigue siendo usable aunque la red falle.
        if (!cache.has(typeCode)) {
          setErrorPorCatalogo({ typeCode, mensaje: mensajeDeApiError(error) });
        }
      });

    return () => {
      vigente = false;
    };
  }, [typeCode]);

  // El estado se deriva, no se sincroniza: la caché manda, y lo recibido por
  // red solo cuenta si corresponde al catálogo que se está pidiendo ahora.
  const delCache = cache.get(typeCode)?.items;
  const items = delCache ?? (recibido?.typeCode === typeCode ? recibido.items : []);
  const errorMessage = errorPorCatalogo?.typeCode === typeCode ? errorPorCatalogo.mensaje : null;

  return {
    items,
    // Cargando solo mientras no haya nada que mostrar: un desplegable que ya
    // tiene opciones no debe parpadear porque el caché venció.
    isLoading: items.length === 0 && errorMessage === null,
    errorMessage,
  };
}

/**
 * Los ítems como opciones de `Select`. Evita repetir el mapeo en cada
 * formulario y mantiene un solo sitio donde adaptar el contrato del catálogo a
 * la forma que el componente espera.
 *
 * El `id` se rellena con la posición porque `SelectOption` aún lo pide, pero no
 * significa nada: el propio `Select` compara por `code` y nunca por `id`.
 */
export function useCatalogOptions(typeCode: string): {
  options: SelectOption[];
  isLoading: boolean;
  errorMessage: string | null;
} {
  const { items, isLoading, errorMessage } = useCatalog(typeCode);

  const options = items.map((item, indice) => ({
    id: indice + 1,
    code: item.code,
    label: item.label,
  }));

  return { options, isLoading, errorMessage };
}

/**
 * Los tipos de un catálogo jerárquico que cuelgan de la clase elegida. Es lo que
 * encadena los dos selectores del formulario de campo (CA-07): sin clase elegida
 * la lista va vacía, no completa, para que nadie registre un tipo que no
 * corresponde a su clase.
 */
export function useChildCatalogOptions(
  typeCode: string,
  parentCode: string | null,
): { options: SelectOption[]; isLoading: boolean } {
  const { items, isLoading } = useCatalog(typeCode);

  const options = parentCode
    ? items
        .filter((item) => item.parentCode === parentCode)
        .map((item, indice) => ({ id: indice + 1, code: item.code, label: item.label }))
    : [];

  return { options, isLoading };
}

/** Solo para tests: deja la caché como recién arrancada. */
export function __resetCatalogCache(): void {
  cache.clear();
  enVuelo.clear();
}
