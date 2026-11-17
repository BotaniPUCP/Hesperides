'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  ContactCatalogEntry, ContactSummary, OrganizationCatalogEntry, OrganizationRef, OrganizationSuggestion,
} from '@shared/types';
import { useAuth } from '@/hooks/useAuth';
import { directoryApi } from '@/lib/directory-api';
import {
  findSimilarContacts, findSimilarOrganizations, matchesContactSearch, matchesSearch,
} from '@/lib/directory-similar';

/**
 * Los catálogos completos de organizaciones y contactos, cargados una vez por
 * sesión: buscar parecidos y filtrar se resuelve en el cliente, sin una llamada
 * al backend por cada letra. `refresh()` los vuelve a pedir tras crear, editar,
 * vincular o importar.
 */
interface DirectoryCatalogValue {
  entries: readonly OrganizationCatalogEntry[];
  /** Los parecidos de una organización: el mismo contrato que el endpoint `/similar`. */
  findSimilar: (name: string, excludeCode?: string) => OrganizationSuggestion[];
  /** El filtro de las listas del picker: igual que `?q=` del backend. */
  filter: (search: string) => readonly OrganizationCatalogEntry[];
  /** Lo mismo, para contactos. */
  contacts: readonly ContactCatalogEntry[];
  findSimilarContacts: (fullName: string) => ContactSummary[];
  filterContacts: (search: string) => readonly ContactCatalogEntry[];
  ready: boolean;
  refresh: () => void;
}

const EMPTY: DirectoryCatalogValue = {
  entries: [],
  findSimilar: () => [],
  filter: () => [],
  contacts: [],
  findSimilarContacts: () => [],
  filterContacts: () => [],
  ready: false,
  refresh: () => undefined,
};

const DirectoryCatalogContext = createContext<DirectoryCatalogValue>(EMPTY);

export function DirectoryCatalogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const signedIn = user !== null;
  const [entries, setEntries] = useState<readonly OrganizationCatalogEntry[]>([]);
  const [contacts, setContacts] = useState<readonly ContactCatalogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // Solo con sesión: sin ella la API devolvería 401 y no hay catálogo que mirar.
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    // allSettled: un catálogo que falla no se lleva al otro; lo que llegue se usa.
    Promise.allSettled([directoryApi.catalog(), directoryApi.contactsCatalog()]).then(([orgs, people]) => {
      if (!alive) return;
      if (orgs.status === 'fulfilled') setEntries(orgs.value);
      if (people.status === 'fulfilled') setContacts(people.value);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [signedIn, version]);

  const value = useMemo<DirectoryCatalogValue>(() => ({
    entries,
    findSimilar: (name, excludeCode) => findSimilarOrganizations(entries, name, excludeCode),
    filter: (search) => entries.filter((e) => matchesSearch(e, search)),
    contacts,
    findSimilarContacts: (fullName) => findSimilarContacts(contacts, fullName),
    filterContacts: (search) => contacts.filter((c) => matchesContactSearch(c, search)),
    ready: loaded,
    refresh,
  }), [entries, contacts, loaded, refresh]);

  return <DirectoryCatalogContext.Provider value={value}>{children}</DirectoryCatalogContext.Provider>;
}

export function useDirectoryCatalog(): DirectoryCatalogValue {
  return useContext(DirectoryCatalogContext);
}

/** El catálogo (o lo recién registrado) en forma de OrganizationRef, para elegirla en un picker. */
export function asRef(entry: { code: string; name: string; active?: boolean }): OrganizationRef {
  return { code: entry.code, name: entry.name, active: entry.active ?? true };
}
