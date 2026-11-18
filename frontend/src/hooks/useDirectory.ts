'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ContactDetail, ContactSummary, OrganizationDetail, OrganizationSuggestion } from '@shared/types';
import { directoryApi } from '@/lib/directory-api';
import { contactsList, organizationsList } from '@/lib/preload/directoryLists';
import { similarContacts, similarOrganizations } from '@/lib/search/directorySimilar';
import { useAuth } from './useAuth';
import { usePreloadedList } from './usePreloadedList';
import { useRequest } from './useRequest';

/** Igual que el backend (DirectoryAccess.MAINTAINERS): el capataz solo ve y busca (SPEC-106 §9.1). */
const MAINTAINERS = ['ADMIN', 'COORDINADOR'];

export function useCanMaintainDirectory(): boolean {
  const { user } = useAuth();
  return user !== null && MAINTAINERS.includes(user.role.code);
}

/** Todas las organizaciones vigentes, para buscarlas en el navegador (SPEC-119). */
export const useOrganizationList = (enabled = true) => usePreloadedList(organizationsList, enabled);

/** Todos los contactos vigentes, para buscarlos en el navegador (SPEC-119). */
export const useContactList = (enabled = true) => usePreloadedList(contactsList, enabled);

export function useOrganization(code: string) {
  const [version, setVersion] = useState(0);
  const { data, loading, errorMessage, notFound } = useRequest(`${code}:${version}`, () =>
    directoryApi.organization(code));
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { organization: data as OrganizationDetail | null, loading, errorMessage, notFound, reload };
}

export function useContact(code: string) {
  const [version, setVersion] = useState(0);
  const { data, loading, errorMessage, notFound } = useRequest(`${code}:${version}`, () => directoryApi.contact(code));
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { contact: data as ContactDetail | null, loading, errorMessage, notFound, reload };
}

/** Parecidos mientras se escribe un nombre nuevo; con menos de 3 letras casi todo se parecería. */
const MIN_SIMILAR_LENGTH = 3;

export function useSimilarOrganizations(name: string, enabled: boolean): OrganizationSuggestion[] {
  const { items } = useOrganizationList(enabled);
  const text = name.trim();
  const ask = enabled && text.length >= MIN_SIMILAR_LENGTH;
  return useMemo(() => (ask ? similarOrganizations(items, text) : []), [ask, items, text]);
}

export function useSimilarContacts(fullName: string, enabled: boolean): ContactSummary[] {
  const { items } = useContactList(enabled);
  const text = fullName.trim();
  const ask = enabled && text.length >= MIN_SIMILAR_LENGTH;
  return useMemo(() => (ask ? similarContacts(items, text) : []), [ask, items, text]);
}
