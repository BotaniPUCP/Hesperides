'use client';

import { useCallback, useState } from 'react';
import type {
  ContactDetail,
  ContactSummary,
  DirectoryPage,
  OrganizationDetail,
  OrganizationSuggestion,
  OrganizationSummary,
} from '@shared/types';
import { directoryApi, type ContactFilters, type OrganizationFilters } from '@/lib/directory-api';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { useAuth } from './useAuth';
import { useDebouncedValue } from './useDebouncedValue';
import { useRequest } from './useRequest';

/** Igual que el backend (DirectoryAccess.MAINTAINERS): el capataz solo ve y busca (SPEC-106 §9.1). */
const MAINTAINERS = ['ADMIN', 'COORDINADOR'];

export function useCanMaintainDirectory(): boolean {
  const { user } = useAuth();
  return user !== null && MAINTAINERS.includes(user.role.code);
}

const EMPTY_PAGE = { page: 0, size: 0, total: 0, items: [] };

/** `version` se sube tras guardar para volver a pedir la lista. */
export function useOrganizations(filters: OrganizationFilters, page: number, version = 0, enabled = true) {
  const key = enabled ? JSON.stringify([filters, page, version]) : null;
  const { data, loading, errorMessage } = useRequest(key, () => directoryApi.organizations(filters, page),
    { keepPreviousData: true });
  return { result: (data ?? EMPTY_PAGE) as DirectoryPage<OrganizationSummary>, loading, errorMessage };
}

export function useContacts(filters: ContactFilters, page: number, version = 0, enabled = true) {
  const key = enabled ? JSON.stringify([filters, page, version]) : null;
  const { data, loading, errorMessage } = useRequest(key, () => directoryApi.contacts(filters, page),
    { keepPreviousData: true });
  return { result: (data ?? EMPTY_PAGE) as DirectoryPage<ContactSummary>, loading, errorMessage };
}

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

/** Parecidos mientras se escribe un nombre nuevo; no consulta con menos de 3 letras ni sin permiso. */
const MIN_SIMILAR_LENGTH = 3;

export function useSimilarOrganizations(name: string, enabled: boolean) {
  const text = useDebouncedValue(name.trim(), SEARCH_DEBOUNCE_MS);
  const ask = enabled && text.length >= MIN_SIMILAR_LENGTH;
  const { data } = useRequest(ask ? text : null, () => directoryApi.similarOrganizations(text));
  return (ask ? (data ?? []) : []) as OrganizationSuggestion[];
}

export function useSimilarContacts(fullName: string, enabled: boolean) {
  const text = useDebouncedValue(fullName.trim(), SEARCH_DEBOUNCE_MS);
  const ask = enabled && text.length >= MIN_SIMILAR_LENGTH;
  const { data } = useRequest(ask ? text : null, () => directoryApi.similarContacts(text));
  return (ask ? (data ?? []) : []) as ContactSummary[];
}
