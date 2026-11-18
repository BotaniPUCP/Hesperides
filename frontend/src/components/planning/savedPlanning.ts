import type { PlanningAssignment } from '@shared/types';

const KEY = 'hesperides:planning-saved';

/** La clave de una tarjeta de planificación: conjunto y actividad. */
export const planningKey = (p: { setId: number; activityTypeItemId: number }) => `${p.setId}:${p.activityTypeItemId}`;

/**
 * La planificación recién creada o editada, para que la lista la muestre arriba y elegida al volver:
 * la lista va por urgencia y una nueva puede caer debajo de las atrasadas.
 */
export function rememberSavedPlanning(saved: PlanningAssignment) {
  try { sessionStorage.setItem(KEY, planningKey(saved)); } catch { /* sin almacenamiento: la lista queda en su orden */ }
}

/** Se lee una sola vez: al recargar, la lista vuelve a su orden por urgencia. */
export function takeSavedPlanning(): string | null {
  try {
    const key = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return key;
  } catch {
    return null;
  }
}

/** La recién guardada primero; las demás, en el orden por urgencia que trae el servidor. */
export function savedPlanningFirst<T extends { setId: number; activityTypeItemId: number }>(rows: T[], key: string | null): T[] {
  const saved = rows.find((r) => planningKey(r) === key);
  return saved ? [saved, ...rows.filter((r) => r !== saved)] : rows;
}
