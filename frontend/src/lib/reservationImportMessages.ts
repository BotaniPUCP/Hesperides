import type { ReservationImportRowIssue } from '@shared/types';

/**
 * Los motivos por fila del registro masivo de reservas (SPEC-107 §5.4). El
 * backend manda un código estable y el dato que lo explica; aquí se arma la frase.
 */
const ISSUES: Record<string, (issue: ReservationImportRowIssue) => string> = {
  REQUIRED: (issue) => `Falta «${issue.column}».`,
  UNKNOWN_GARDEN: (issue) => `«${issue.detail}» no es un jardín del catálogo de lugares.`,
  GARDEN_NOT_RESERVABLE: (issue) => `«${issue.detail}» no es un jardín prestable.`,
  UNKNOWN_ORGANIZATION: (issue) => `«${issue.detail}» no está en el Directorio.`,
  UNKNOWN_CONTACT: (issue) =>
    issue.column === 'solicitante'
      ? `«${issue.detail}» no es un contacto de la organización que pide.`
      : `«${issue.detail}» no es un contacto del Directorio.`,
  AMBIGUOUS_CONTACT: (issue) =>
    `«${issue.detail}» coincide con más de una persona: usa su código.`,
  DATE_FORMAT: (issue) => `«${issue.detail}» no es una fecha válida: usa dd/mm/aaaa hh:mm.`,
  END_BEFORE_START: () => 'La hora de fin debe ser posterior a la de inicio.',
  MAX_DURATION: () => 'Una reserva no puede durar más de 7 días.',
  TOO_LONG: (issue) => `«${issue.column}» es demasiado largo.`,
};

export function reservationIssueMessage(issue: ReservationImportRowIssue): string {
  return ISSUES[issue.code]?.(issue) ?? `Revisa «${issue.column}».`;
}
