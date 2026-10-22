import { useAuthContext } from '@/lib/auth-context';

/** Punto de entrada único a la sesión para los componentes. Tolerante a pantallas públicas sin AuthProvider. */
export function useAuth() {
  try {
    return useAuthContext();
  } catch {
    return {
      user: null,
      isLoading: false,
      login: async () => {},
      logout: async () => {},
      refreshSession: async () => {},
    };
  }
}
