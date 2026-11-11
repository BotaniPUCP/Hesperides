/** Una actividad elegible, con el nombre de su grupo (la clase de intervención). */
export interface ActivityOption {
  id: number;
  code: string;
  label: string;
  parentCode?: string | null;
}

export interface ActivityGroup {
  label: string;
  activities: ActivityOption[];
}

const WITHOUT_GROUP = 'Otras actividades';

/** El grupo con que se muestra una actividad. */
export const groupOf = (activity: ActivityOption): string => activity.parentCode || WITHOUT_GROUP;

/**
 * Agrupa las actividades por su grupo, en el orden en que llegan: el servidor ya
 * las ordena por grupo y luego por nombre. Los grupos solo ordenan la lista; lo
 * que se elige es siempre una actividad.
 */
export function groupActivities(activities: ActivityOption[]): ActivityGroup[] {
  const groups = new Map<string, ActivityOption[]>();
  for (const activity of activities) {
    const label = groupOf(activity);
    groups.set(label, [...(groups.get(label) ?? []), activity]);
  }
  return [...groups].map(([label, items]) => ({ label, activities: items }));
}
