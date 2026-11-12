'use client';

import type { MaintenanceScope } from '@shared/types';
import { FrequencyChoice } from './FrequencyChoice';

export const PLANNING_PATH = '/intervenciones/planificacion';

/** Planificación con la actividad de una frecuencia ya filtrada; allí «Ver todas» quita el filtro. */
export const planningOfActivity = (activityId: number) => `${PLANNING_PATH}?actividad=${activityId}`;

/** «1 planificación», «3 planificaciones». */
export const planningsLabel = (n: number) => (n === 1 ? '1 planificación' : `${n} planificaciones`);

interface Props {
  scope: MaintenanceScope;
  onScope: (scope: MaintenanceScope) => void;
}

/**
 * Dónde rige una frecuencia (SPEC-203 D-16): en todo el campus o solo en algunas áreas. La
 * frecuencia es de su actividad; en qué áreas se usa una de «solo algunas áreas» se decide al
 * crear cada planificación, no aquí.
 */
export function FrequencyScopeFields({ scope, onScope }: Props) {
  return (
    <FrequencyChoice legend="Se aplica a" name="frequency-scope" value={scope} onChange={onScope}
      options={[{ value: 'CAMPUS_WIDE', label: 'Todo el campus' }, { value: 'BY_SET', label: 'Solo algunas áreas' }]}
      hint={scope === 'BY_SET'
        ? 'Las áreas se eligen al crear cada planificación.'
        : 'Rige en todo el campus y es la que se propone al planificar.'} />
  );
}
