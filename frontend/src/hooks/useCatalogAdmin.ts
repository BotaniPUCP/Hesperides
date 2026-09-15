'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CatalogType,
  CatalogTypeDetail,
  CreateCatalogItemRequest,
  UpdateCatalogItemRequest,
} from '@shared/types';
import { catalogsApi } from '@/lib/catalogs-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { invalidarCatalogo } from './useCatalog';

/**
 * Los datos de administración no pasan por la caché de useCatalog: esa sirve
 * desplegables y solo trae los ítems activos. Aquí hace falta ver también los
 * inactivos, y recién guardados, no cacheados cinco minutos.
 */

export interface UseCatalogTypesResult {
  types: CatalogType[];
  isLoading: boolean;
  errorMessage: string | null;
}

export function useCatalogTypes(): UseCatalogTypesResult {
  const [types, setTypes] = useState<CatalogType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    catalogsApi
      .allTypes()
      .then((recibidos) => {
        if (!vigente) return;
        setTypes(recibidos);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (vigente) setErrorMessage(mensajeDeApiError(error));
      })
      .finally(() => {
        if (vigente) setIsLoading(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  return { types, isLoading, errorMessage };
}

export interface UseCatalogDetailResult {
  detail: CatalogTypeDetail | null;
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => void;
}

export function useCatalogDetail(typeCode: string | null): UseCatalogDetailResult {
  // El detalle se guarda junto al catálogo al que pertenece: así, al cambiar de
  // uno a otro, el valor derivado descarta el anterior sin necesidad de
  // limpiarlo con setState desde el efecto.
  const [recibido, setRecibido] = useState<{ typeCode: string; detail: CatalogTypeDetail } | null>(null);
  const [fallo, setFallo] = useState<{ typeCode: string; mensaje: string } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!typeCode) return;

    let vigente = true;

    catalogsApi
      .typeDetail(typeCode)
      .then((detalle) => {
        if (!vigente) return;
        setRecibido({ typeCode, detail: detalle });
        setFallo(null);
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        setFallo({ typeCode, mensaje: mensajeDeApiError(error) });
      });

    return () => {
      vigente = false;
    };
  }, [typeCode, reloadToken]);

  const detail = recibido?.typeCode === typeCode ? recibido.detail : null;
  const errorMessage = fallo?.typeCode === typeCode ? fallo.mensaje : null;

  return {
    detail,
    // Cargando mientras hay una petición en vuelo para este catálogo y todavía
    // no hay nada suyo que mostrar.
    isLoading: typeCode !== null && detail === null && errorMessage === null,
    errorMessage,
    refresh,
  };
}

export interface UseCatalogMutationsResult {
  crear: (typeCode: string, body: CreateCatalogItemRequest) => Promise<void>;
  editar: (typeCode: string, code: string, body: UpdateCatalogItemRequest) => Promise<void>;
  desactivar: (typeCode: string, code: string) => Promise<void>;
  activar: (typeCode: string, code: string) => Promise<void>;
}

/**
 * Cada escritura invalida la caché de consumo de ese catálogo: sin eso, un
 * desplegable abierto en otra pestaña seguiría ofreciendo hasta cinco minutos
 * una opción que el administrador acaba de retirar.
 *
 * Los errores se propagan sin envolver: quien llama decide si van a un toast o
 * al pie del formulario, y el 422 de un ítem protegido debe llegar con su
 * mensaje del backend, que explica el motivo mejor que uno genérico.
 */
export function useCatalogMutations(onDone: () => void): UseCatalogMutationsResult {
  const trasEscribir = useCallback(
    (typeCode: string) => {
      invalidarCatalogo(typeCode);
      onDone();
    },
    [onDone],
  );

  return {
    crear: async (typeCode, body) => {
      await catalogsApi.createItem(typeCode, body);
      trasEscribir(typeCode);
    },
    editar: async (typeCode, code, body) => {
      await catalogsApi.updateItem(typeCode, code, body);
      trasEscribir(typeCode);
    },
    desactivar: async (typeCode, code) => {
      await catalogsApi.deactivateItem(typeCode, code);
      trasEscribir(typeCode);
    },
    activar: async (typeCode, code) => {
      await catalogsApi.activateItem(typeCode, code);
      trasEscribir(typeCode);
    },
  };
}
