import type { MessagePattern } from './placeErrorMessages';

/**
 * Los errores del calendario del campus (SPEC-114) en español. El backend habla en inglés
 * técnico a propósito (SPEC-000); aquí se decide qué lee la persona.
 */
export const CAMPUS_EVENT_MESSAGES: Record<string, string> = {
  'The end date is before the start date': 'La fecha de fin es anterior a la de inicio.',
  'Both start and end time are required, or neither': 'Indica la hora de inicio y la de fin, o desmarca «Con horario».',
  'The end time must be after the start time': 'La hora de fin debe ser posterior a la de inicio.',
  'A holiday applies to the whole campus': 'Un feriado aplica a todo el campus: no se registra para un sector ni una sección.',
  'With those weekdays the event does not happen on any of its dates':
    'Con esos días de la semana, el evento no ocurre ningún día entre esas fechas.',
  'The name is required': 'Escribe el nombre del evento.',
  'The name is too long': 'El nombre es demasiado largo: hasta 150 caracteres.',
  'The description is too long': 'La descripción es demasiado larga: hasta 500 caracteres.',
  'Start and end dates are required': 'Indica la fecha de inicio y la de fin.',
  'Unknown event scope': 'Elige si el evento es de todo el campus, de un sector o de una sección.',
  'A campus-wide event has no zone': 'Un evento de todo el campus no lleva sector ni sección.',
  'The zone does not match the event scope': 'Elige el sector o la sección donde ocurre el evento.',
  'Weekdays go from 1 (Monday) to 7 (Sunday)': 'Los días de la semana no son válidos. Vuelve a marcarlos.',
  'The event was changed by someone else': 'Otra persona cambió este evento. Recarga para ver su versión.',
  'Unknown event type': 'Elige si el evento es bloqueante o feriado.',
};

export const CAMPUS_EVENT_PATTERNS: readonly MessagePattern[] = [
  [/^An event lasts at most (\d+) days$/, (m) => `Un evento dura como máximo ${m[1]} días. Revisa la fecha de fin.`],
  [/^The range must go forward and last at most (\d+) days$/,
    (m) => `La agenda se consulta por rangos de hasta ${m[1]} días. Elige otro mes.`],
];
