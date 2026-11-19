import type {
  ContactDetail,
  ContactInput,
  ContactSummary,
  DirectoryImportKind,
  DirectoryImportOutcome,
  DirectoryImportPlan,
  DirectoryPage,
  OrganizationDetail,
  OrganizationInput,
  OrganizationSuggestion,
  OrganizationSummary,
} from '@shared/types';
import { apiClient } from './api';

/** Los endpoints de SPEC-106 §3 en un solo sitio: las pantallas no arman rutas a mano. */

export const DIRECTORY_PAGE_SIZE = 20;

export interface OrganizationFilters {
  search?: string;
  typeCode?: string;
}

export interface ContactFilters {
  search?: string;
  organizationCode?: string;
  withoutOrganization?: boolean;
}

const ORGS = '/directory/organizations';
const IMPORTS = '/imports';
const CONTACTS = '/directory/contacts';
const segment = encodeURIComponent;

function query(entries: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    // Un texto en blanco no es un filtro: `?q=` buscaría «nada».
    if (value === undefined || value === false || (typeof value === 'string' && value.trim() === '')) continue;
    params.set(key, String(typeof value === 'string' ? value.trim() : value));
  }
  return params.toString();
}

export const directoryApi = {
  organizations: (filters: OrganizationFilters, page: number, size = DIRECTORY_PAGE_SIZE) =>
    apiClient.get<DirectoryPage<OrganizationSummary>>(
      `${ORGS}?${query({ q: filters.search, typeCode: filters.typeCode, page, size })}`),

  similarOrganizations: (name: string) =>
    apiClient.get<OrganizationSuggestion[]>(`${ORGS}/similar?${query({ name })}`),

  organization: (code: string) => apiClient.get<OrganizationDetail>(`${ORGS}/${segment(code)}`),

  createOrganization: (input: OrganizationInput) => apiClient.post<{ code: string }>(ORGS, input),

  updateOrganization: (code: string, input: OrganizationInput) => apiClient.put<null>(`${ORGS}/${segment(code)}`, input),

  deactivateOrganization: (code: string) => apiClient.del<null>(`${ORGS}/${segment(code)}`),

  contacts: (filters: ContactFilters, page: number, size = DIRECTORY_PAGE_SIZE) =>
    apiClient.get<DirectoryPage<ContactSummary>>(`${CONTACTS}?${query({
      q: filters.search, organizationCode: filters.organizationCode,
      withoutOrganization: filters.withoutOrganization, page, size,
    })}`),

  similarContacts: (fullName: string) =>
    apiClient.get<ContactSummary[]>(`${CONTACTS}/similar?${query({ fullName })}`),

  contact: (code: string) => apiClient.get<ContactDetail>(`${CONTACTS}/${segment(code)}`),

  createContact: (input: ContactInput) => apiClient.post<{ code: string }>(CONTACTS, input),

  updateContact: (code: string, input: ContactInput) => apiClient.put<null>(`${CONTACTS}/${segment(code)}`, input),

  linkContact: (code: string, organizationCode: string, role?: string | null) =>
    apiClient.post<null>(`${CONTACTS}/${segment(code)}/organizations`, { organizationCode, role }),

  /** Cambia solo el rol del vínculo; no toca el vínculo ni los datos (SPEC-106 §4.3). */
  updateLinkRole: (code: string, organizationCode: string, role: string | null) =>
    apiClient.put<null>(`${CONTACTS}/${segment(code)}/organizations/${segment(organizationCode)}`, { role }),

  deactivateContact: (code: string) => apiClient.del<null>(`${CONTACTS}/${segment(code)}`),

  importTemplate: (kind: DirectoryImportKind) => apiClient.getBlob(`${IMPORTS}/templates/${segment(kind)}`),

  /** No escribe en el Directorio: abre un lote con lo que pasaría con cada fila (ciclo común, SPEC-103 D-04). */
  previewImport: (kind: DirectoryImportKind, file: File) =>
    apiClient.postForm<DirectoryImportPlan>(`${IMPORTS}/${segment(kind)}/preview`, withFile(file)),

  /** Escribe lo revisado en el lote. Todo o nada: con una fila con error responde 422 y no guarda ninguna. */
  confirmImport: (batchId: number) => apiClient.post<DirectoryImportOutcome>(`${IMPORTS}/${batchId}/confirm`, {}),
};

function withFile(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}
