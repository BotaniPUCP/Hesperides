import type { ImportRowIssue } from '@shared/types';

/**
 * Los motivos por fila del registro masivo (SPEC-106) en español. El backend
 * manda un código estable y el dato que lo explica; aquí se arma la frase.
 */
const ISSUES: Record<string, (issue: ImportRowIssue) => string> = {
  REQUIRED: (i) => `Falta «${i.column}».`,
  TOO_LONG: (i) => `«${i.column}» es demasiado largo.`,
  UNKNOWN_TYPE: (i) => `«${i.detail}» no es un tipo válido: usa «Unidad PUCP» o «Empresa externa».`,
  RUC_FORMAT: () => 'El RUC debe tener 11 dígitos y empezar con 10 o 20.',
  RUC_NOT_FOR_UNIT: () => 'Una unidad PUCP no lleva RUC; solo las empresas externas.',
  RUC_TAKEN: (i) => `Otra organización ya tiene el RUC ${i.detail}.`,
  NAME_TAKEN: (i) => `Ese nombre o alias ya lo usa «${i.detail}».`,
  DUPLICATED_IN_FILE: (i) => (i.detail ? `«${i.detail}» se repite en el archivo.` : 'Esta fila se repite en el archivo.'),
  UNKNOWN_ORGANIZATION: (i) => `«${i.detail}» no está en el directorio: regístrala primero.`,
  EXTENSION_FORMAT: () => 'El anexo debe tener 4 dígitos.',
  MOBILE_FORMAT: () => 'El celular debe tener 9 dígitos y empezar con 9.',
  EMAIL_FORMAT: () => 'El correo no es válido.',
};

export function issueMessage(issue: ImportRowIssue): string {
  return ISSUES[issue.code]?.(issue) ?? `Revisa «${issue.column}».`;
}
