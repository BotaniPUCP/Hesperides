import type { MessagePattern } from './placeErrorMessages';

/**
 * SPEC-203: conjuntos de áreas verdes y frecuencias por conjunto. El backend ya
 * los escribe en español; aquí se ajusta lo que lee el usuario.
 */
export const PLANNING_MESSAGES: Record<string, string> = {
  'Ya existe un conjunto con ese nombre': 'Ya existe un conjunto con ese nombre.',
  'El nombre del conjunto es obligatorio': 'Ponle un nombre al conjunto.',
  'Elige al menos un jardín': 'Elige al menos un jardín.',
  'Elige al menos una actividad': 'Elige al menos una actividad que se planifique en este conjunto.',
  'Otra persona cambió este conjunto. Recarga para ver su versión.':
    'Otra persona cambió este conjunto mientras lo editabas. Recarga para ver su versión.',
  'Quita primero la frecuencia propia de este conjunto':
    'Este conjunto tiene una frecuencia propia. Quítala primero desde Frecuencias.',
  'Conjunto no encontrado': 'El conjunto no existe o ya fue dado de baja.',
  'Elige el conjunto al que se aplica esta frecuencia': 'Elige el conjunto al que se aplica esta frecuencia.',
  'El conjunto no existe o fue dado de baja': 'El conjunto ya no existe o fue dado de baja.',
  'Solo una frecuencia propia de un conjunto lleva conjunto': 'Una frecuencia de todo el campus no lleva conjunto.',
  'Ya existe una frecuencia vigente para esta actividad, modalidad y ámbito':
    'Ya hay una frecuencia vigente para esta actividad, modalidad y alcance.',
};

/** Mensajes que traen ids al final («…: 7, 9»); los ids no le dicen nada al usuario. */
export const PLANNING_PATTERNS: readonly MessagePattern[] = [
  [/^Solo se pueden agregar secciones: /, () => 'Solo se pueden agregar jardines. Revisa la selección.'],
  [/^Actividades no válidas: /, () => 'Alguna actividad elegida ya no existe. Recarga la página.'],
];
