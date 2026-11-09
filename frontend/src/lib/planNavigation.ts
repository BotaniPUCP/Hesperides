/** La dirección con que la planificación abre el registro de intervención (SPEC-203 §5.6). */
type Query = Record<string, string | string[] | undefined>;

const positive = (value: string | string[] | undefined): number | null => {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
};

/** `?conjunto=3&actividad=30`; cualquier valor inválido deja el formulario vacío, sin error. */
export function plannedFrom(query: Query): { setId: number; activityId: number } | null {
  const setId = positive(query.conjunto);
  const activityId = positive(query.actividad);
  return setId && activityId ? { setId, activityId } : null;
}
