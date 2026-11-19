import type { MessagePattern } from './placeErrorMessages';

/**
 * SPEC-203: conjuntos de áreas verdes, frecuencias y su asignación a conjuntos. El backend ya
 * los escribe en español; aquí se ajusta lo que lee el usuario.
 */
export const PLANNING_MESSAGES: Record<string, string> = {
  'Ya existe un conjunto con ese nombre': 'Ya existe un conjunto con ese nombre.',
  'El nombre del conjunto es obligatorio': 'Ponle un nombre al conjunto.',
  'Elige al menos un jardín o un ejemplar': 'Elige al menos un jardín o un ejemplar.',
  'Otra persona cambió este conjunto. Recarga para ver su versión.':
    'Otra persona cambió este conjunto mientras lo editabas. Recarga para ver su versión.',
  'Conjunto no encontrado': 'El conjunto no existe o ya fue dado de baja.',
  'El conjunto no existe o fue dado de baja': 'El conjunto ya no existe o fue dado de baja.',
  'Ya existe una frecuencia vigente de todo el campus para esta actividad y modalidad':
    'Ya hay una frecuencia de todo el campus vigente para esta actividad y modalidad. Edítala, o crea una para solo algunas áreas.',
  // §3.4: asignar frecuencias a conjuntos.
  'Elige el conjunto': 'Elige el conjunto.',
  'Esa frecuencia ya no está vigente; elige la actual': 'Esa frecuencia ya no está vigente. Recarga y elige la actual.',
  'Las frecuencias tercerizadas no se planifican': 'Las frecuencias tercerizadas no se planifican: elige una de personal propio.',
  'Una frecuencia a demanda no se planifica': 'Una frecuencia a demanda no se planifica: elige una con periodicidad.',
  'Asignación no encontrada': 'Esa asignación ya no existe. Recarga la página.',
  'Frecuencia no encontrada': 'Esa frecuencia ya no existe. Recarga la página.',
};

/** Mensajes que traen ids al final («…: 7, 9»); los ids no le dicen nada al usuario. */
export const PLANNING_PATTERNS: readonly MessagePattern[] = [
  [/^Solo se pueden agregar secciones: /, () => 'Solo se pueden agregar jardines. Revisa la selección.'],
  [/^Ejemplares no válidos: /, () => 'Algún ejemplar elegido fue dado de baja. Revisa la selección.'],
  // El backend nombra el conjunto y la actividad: el mensaje ya se entiende tal cual.
  [/ ya tiene una planificación de .+\. Edítala en vez de crear otra\.$/, (m) => m.input ?? m[0]],
  [/^La frecuencia nueva debe ser de /, (m) => `${m.input ?? m[0]}.`],
];
