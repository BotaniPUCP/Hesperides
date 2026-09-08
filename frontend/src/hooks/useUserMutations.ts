import { useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type {
  CreateUserInput,
  CredentialsDeliveryResult,
  UpdateUserInput,
  UserRow,
} from '@/lib/users';

/**
 * Acciones de administración de usuarios (SPEC-100 §3). Cada función llama a
 * la API y devuelve la ficha actualizada; quién dispara el toast y el estado
 * de carga del botón es asunto de la página.
 */
export function useUserMutations() {
  const create = useCallback(async (input: CreateUserInput): Promise<UserRow> => {
    return apiClient.post<UserRow>('/users', input);
  }, []);

  const update = useCallback(async (id: number, input: UpdateUserInput): Promise<UserRow> => {
    return apiClient.put<UserRow>(`/users/${id}`, input);
  }, []);

  const deactivate = useCallback(async (id: number): Promise<UserRow> => {
    return apiClient.post<UserRow>(`/users/${id}/deactivate`);
  }, []);

  const reactivate = useCallback(async (id: number): Promise<UserRow> => {
    return apiClient.post<UserRow>(`/users/${id}/reactivate`);
  }, []);

  const resendCredentials = useCallback(
    async (id: number): Promise<CredentialsDeliveryResult> => {
      return apiClient.post<CredentialsDeliveryResult>(`/users/${id}/resend-credentials`);
    },
    [],
  );

  const markCredentialsDelivered = useCallback(async (id: number): Promise<UserRow> => {
    return apiClient.post<UserRow>(`/users/${id}/mark-credentials-delivered`);
  }, []);

  return { create, update, deactivate, reactivate, resendCredentials, markCredentialsDelivered };
}