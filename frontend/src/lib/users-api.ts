import type {
  ChangePasswordPayload,
  CreateUserPayload,
  CredentialDelivery,
  Page,
  UpdateUserPayload,
  UserDetail,
  UserFilters,
} from '@shared/types';
import { apiClient } from './api';
import { USERS_PAGE_SIZE } from './constants';

/**
 * Los nueve endpoints de SPEC-100 en un solo sitio. Los componentes llaman aquí,
 * nunca a apiClient con rutas a mano: así una ruta mal escrita se arregla en un
 * lugar y no en cinco pantallas.
 */

function buildQuery(filters: UserFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), size: String(USERS_PAGE_SIZE) });

  // Se comparan contra undefined y no por truthiness: isActive=false es el filtro
  // "solo inactivos", y un `if (filters.isActive)` lo descartaría silenciosamente.
  // search se descarta si está en blanco, porque `?search=` no significa "no filtrar".
  if (filters.search !== undefined && filters.search.trim() !== '') {
    params.set('search', filters.search.trim());
  }
  if (filters.roleCode !== undefined && filters.roleCode !== '') {
    params.set('roleCode', filters.roleCode);
  }
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters.teamId !== undefined) params.set('teamId', String(filters.teamId));

  return params.toString();
}

export const usersApi = {
  list: (filters: UserFilters, page: number) =>
    apiClient.get<Page<UserDetail>>(`/users?${buildQuery(filters, page)}`),

  getById: (id: number) => apiClient.get<UserDetail>(`/users/${id}`),

  create: (payload: CreateUserPayload) => apiClient.post<UserDetail>('/users', payload),

  update: (id: number, payload: UpdateUserPayload) =>
    apiClient.put<UserDetail>(`/users/${id}`, payload),

  deactivate: (id: number) => apiClient.post<UserDetail>(`/users/${id}/deactivate`),

  reactivate: (id: number) => apiClient.post<UserDetail>(`/users/${id}/reactivate`),

  resendCredentials: (id: number) =>
    apiClient.post<CredentialDelivery>(`/users/${id}/resend-credentials`),

  markCredentialsDelivered: (id: number) =>
    apiClient.post<UserDetail>(`/users/${id}/mark-credentials-delivered`),

  changeOwnPassword: (payload: ChangePasswordPayload) =>
    apiClient.post<null>('/users/me/password', payload),
};
