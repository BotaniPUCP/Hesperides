import type { MessagePattern } from './placeErrorMessages';

/**
 * Los errores del Directorio (SPEC-106 §5.3) en español. Ninguno repite datos
 * de un contacto: el backend tampoco los pone en sus mensajes (§9.3).
 */

export const DIRECTORY_MESSAGES: Record<string, string> = {
  'A PUCP unit has no RUC; only external companies do': 'Una unidad PUCP no lleva RUC; solo las empresas externas.',
  'The RUC must have 11 digits and start with 10 or 20': 'El RUC debe tener 11 dígitos y empezar con 10 o 20.',
  'The extension must have 4 digits': 'El anexo debe tener 4 dígitos.',
  'The mobile must have 9 digits and start with 9': 'El celular debe tener 9 dígitos y empezar con 9.',
  'A contact must belong to at least one active organization':
    'Un contacto debe pertenecer al menos a una organización vigente.',
};

export const DIRECTORY_PATTERNS: readonly MessagePattern[] = [
  [/^The name or an alias is already used by «(.+)»$/,
    ([, owner]) => `Ese nombre o alias ya lo usa «${owner}». Elige esa organización o usa otro nombre.`],
  [/^Another organization already has RUC (\d+)$/, ([, ruc]) => `Otra organización ya tiene el RUC ${ruc}.`],
  [/^The organization (\S+) is deactivated$/,
    ([, code]) => `La organización ${code} está dada de baja. Elige otra o pide que la reactiven.`],
  [/^The contact (\S+) is deactivated$/, ([, code]) => `El contacto ${code} está dado de baja.`],
  [/^The contact \S+ already belongs to «(.+)»$/, ([, name]) => `El contacto ya pertenece a «${name}».`],
  [/^Unknown organization type: .+$/, () => 'El tipo de organización elegido no es válido. Actualiza la pantalla.'],
];
