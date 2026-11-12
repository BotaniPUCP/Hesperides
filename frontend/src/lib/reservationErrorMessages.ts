import type { MessagePattern } from './placeErrorMessages';

/**
 * Las reglas de SPEC-107 §3.2, en español. El backend habla en inglés técnico a
 * propósito; traducir es trabajo del frontend (SPEC-000, SPEC-C02 §6).
 */
export const RESERVATION_MESSAGES: Record<string, string> = {
  'The garden, requester, responsible, start and end are required':
    'Elige el jardín, quién pide, el solicitante y el responsable, y las horas de inicio y fin.',
  'The garden, start and end are required':
    'Elige el jardín y las horas de inicio y fin para consultar los avisos.',
  'That garden cannot be reserved': 'Ese jardín no se puede reservar.',
  'That organization is not in the Directory':
    'Esa organización no está en el Directorio. Elige otra o pide a coordinación que la registre.',
  'The requester must belong to the organization that requests it':
    'El solicitante debe pertenecer a la organización que pide. Elige otro o registra el vínculo en el Directorio.',
  'A responsible contact is required': 'Indica un responsable.',
  'Who requested the reservation cannot change: cancel it and register a new one':
    'Quién pidió la reserva no cambia: anúlala y regístrala de nuevo.',
  'The reservation must end after it starts': 'La reserva debe terminar después de empezar.',
  'A reservation starts and ends on the same day': 'Una reserva va de una hora a otra del mismo día.',
  'The purpose cannot exceed 300 characters': 'El motivo no puede superar los 300 caracteres.',
  'This reservation already finished or was cancelled':
    'Esta reserva ya terminó o fue anulada: solo se puede consultar.',
  'Someone else changed this reservation. Reload to see its version.':
    'Otra persona cambió esta reserva. Recarga para ver su versión.',
  'A cancellation reason is required': 'Indica el motivo de la anulación.',
  'The cancellation reason cannot exceed 500 characters':
    'El motivo de la anulación no puede superar los 500 caracteres.',
  'The date range ends before it starts': 'La fecha final no puede ser anterior a la inicial.',
  'The scheduled date is required': 'Indica la fecha programada.',
  'Each point must be lat,lon': 'Cada punto debe escribirse como latitud,longitud.',
  'A point is outside the valid latitude or longitude':
    'Un punto tiene una latitud o longitud fuera del rango válido.',
};

/** Los mensajes que traen un dato no caben en un diccionario de textos exactos. */
export const RESERVATION_PATTERNS: readonly MessagePattern[] = [
  [/^The file is missing the columns: (.+)$/,
    (match) => `Al archivo le faltan columnas: ${match[1]}.`],
  [/^The file has unknown columns: (.+?)\. Check the spelling against the standard$/,
    (match) => `El archivo tiene columnas desconocidas: ${match[1]}. Revisa la ortografía contra el estándar.`],
  [/^The file has more than (\d+) rows: split it in several files$/,
    (match) => `El archivo tiene más de ${match[1]} filas: divídelo en varios archivos.`],
];
