import type {
  ChangePasswordPayload,
  CreateUserPayload,
  CredentialDelivery,
  UpdateUserPayload,
  UserDetail,
} from '@shared/types';
import { apiClient } from './api';

/**
 * Los nueve endpoints de SPEC-100 en un solo sitio. Los componentes llaman aquí,
 * nunca a apiClient con rutas a mano: así una ruta mal escrita se arregla en un
 * lugar y no en cinco pantallas.
 */

export const usersApi = {
  /** Todos los que ve quien pregunta, activos e inactivos: se filtran y paginan en el navegador (SPEC-119). */
  all: () => apiClient.get<UserDetail[]>('/users/all'),

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
