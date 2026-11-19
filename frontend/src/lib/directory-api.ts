import type {
  ContactDetail,
  ContactInput,
  ContactSummary,
  DirectoryImportKind,
  DirectoryImportOutcome,
  DirectoryImportPlan,
  OrganizationDetail,
  OrganizationInput,
  OrganizationSummary,
} from '@shared/types';
import { apiClient } from './api';

/** Los endpoints de SPEC-106 §3 en un solo sitio: las pantallas no arman rutas a mano. */

export const DIRECTORY_PAGE_SIZE = 20;

const ORGS = '/directory/organizations';
const IMPORTS = '/imports';
const CONTACTS = '/directory/contacts';
const segment = encodeURIComponent;

export const directoryApi = {
  /** Todas las vigentes: se buscan y filtran en el navegador (SPEC-119). */
  allOrganizations: () => apiClient.get<OrganizationSummary[]>(`${ORGS}/all`),

  organization: (code: string) => apiClient.get<OrganizationDetail>(`${ORGS}/${segment(code)}`),

  createOrganization: (input: OrganizationInput) => apiClient.post<{ code: string }>(ORGS, input),

  updateOrganization: (code: string, input: OrganizationInput) => apiClient.put<null>(`${ORGS}/${segment(code)}`, input),

  deactivateOrganization: (code: string) => apiClient.del<null>(`${ORGS}/${segment(code)}`),

  /** Todos los vigentes: se buscan y filtran en el navegador (SPEC-119). */
  allContacts: () => apiClient.get<ContactSummary[]>(`${CONTACTS}/all`),

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
