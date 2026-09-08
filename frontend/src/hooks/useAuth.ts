import { useAuthContext } from '@/lib/auth-context';

/** Punto de entrada único a la sesión para los componentes. */
export function useAuth() {
  return useAuthContext();
}