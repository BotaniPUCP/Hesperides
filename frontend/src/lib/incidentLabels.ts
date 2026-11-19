import type { ActivationGap, ClosureBlocker, HeightClass, PrefillWarning } from '@shared/types';

/** Lo que falta para activar (SPEC-201 §3.6), en las palabras de la pantalla. */
export const ACTIVATION_GAPS: Record<ActivationGap, string> = {
  TYPE: 'tipo',
  URGENCY: 'urgencia',
  LOCATION: 'sección o GPS',
  PROVIDER: 'empresa del tercero',
  AGREED_DAYS: 'días pactados con el tercero (1 a 90)',
  TALL_TREE_NEEDS_THIRD_PARTY: 'un árbol de 5 m o más lo atiende un tercero',
};

/** Por qué todavía no se puede cerrar (SPEC-201 §3.8). */
export const CLOSURE_BLOCKERS: Record<ClosureBlocker, string> = {
  NOT_ACTIVE: 'Activa la incidencia primero.',
  NO_LINKED_WORK: 'Vincula al menos una intervención.',
  WORK_NOT_VALIDATED: 'Hay intervenciones vinculadas que aún no están validadas.',
  CANCELLED_WORK: 'Una intervención vinculada está cancelada: quítala o reemplázala.',
};

export const HEIGHT_CLASSES: Record<HeightClass, string> = {
  UNDER_5M: 'Menos de 5 m',
  OVER_5M: '5 m o más',
  UNCLASSIFIED: 'Árbol sin clasificar',
  NOT_APPLICABLE: 'No es un árbol',
};

export const PREFILL_WARNINGS: Record<PrefillWarning, string> = {
  VERIFY_HEIGHT: 'Verifica la altura del árbol antes de atender.',
  LOW_CONFIDENCE: 'La IA tiene poca confianza en esta clasificación: revísala con cuidado.',
};

export function gapsSentence(gaps: ActivationGap[]): string {
  return `Falta para activar: ${gaps.map((gap) => ACTIVATION_GAPS[gap]).join(', ')}.`;
}
