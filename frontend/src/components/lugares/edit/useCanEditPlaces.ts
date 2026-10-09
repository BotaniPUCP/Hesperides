'use client';

import { useAuth } from '@/hooks/useAuth';

/** Igual que el backend (PlaceController.EDITORS): ocultar botones no es seguridad, pero no promete lo que el backend niega. */
const EDITORS = ['ADMIN', 'COORDINADOR'];

export function useCanEditPlaces(): boolean {
  const { user } = useAuth();
  return user !== null && EDITORS.includes(user.role.code);
}
