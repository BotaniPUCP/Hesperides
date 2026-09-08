import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/api';
import type { ChangePasswordRequest } from '@/lib/users';

/** Cambio de la propia contraseña (SPEC-100 POST /users/me/password). */
export function useChangePassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changePassword = useCallback(async (payload: ChangePasswordRequest) => {
    setIsSubmitting(true);
    try {
      await apiClient.post<void>('/users/me/password', payload);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { changePassword, isSubmitting };
}