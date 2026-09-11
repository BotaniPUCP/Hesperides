import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './constants';

/**
 * La política de SPEC-100 §9.1, expresada como una lista de reglas en vez de
 * como una función que devuelve true o false.
 *
 * Es una lista porque la pantalla de cambio de contraseña tiene que pintar cada
 * requisito por separado y en vivo (§7.1), y una función booleana no puede decir
 * cuáles se cumplen. La misma lista alimenta el indicador visual y el mensaje de
 * error del envío: así nunca se contradicen.
 *
 * Duplica deliberadamente lo que valida `PasswordPolicy` en el backend. No es
 * redundancia inútil: aquí evita un viaje de red para un error ya visible, allá
 * es la validación de verdad, la que nadie puede saltarse con curl.
 */

/** Datos del titular de la cuenta. Todos opcionales: al cambiar la propia contraseña puede no haberlos a mano. */
export interface PasswordOwner {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface PasswordRule {
  id: string;
  /** Texto del indicador en vivo: describe el requisito, no el fallo. */
  label: string;
  /** Texto del error inline al enviar: describe el fallo. */
  message: string;
  isMet: (password: string, owner: PasswordOwner) => boolean;
}

/**
 * Un fragmento de una o dos letras aparecería por azar en casi cualquier
 * contraseña. Tres es el umbral que usa el backend, y ambos deben coincidir:
 * si aquí fuera más laxo, el formulario aprobaría claves que el servidor
 * rechaza con un 400 sin campo asociado.
 */
const MIN_PERSONAL_FRAGMENT = 3;

function containsOwnerData(password: string, owner: PasswordOwner): boolean {
  const lower = password.toLowerCase();
  const localPart = owner.email?.split('@')[0];

  return [localPart, owner.firstName, owner.lastName].some(
    (personal) =>
      personal !== undefined &&
      personal.length >= MIN_PERSONAL_FRAGMENT &&
      lower.includes(personal.toLowerCase()),
  );
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'minLength',
    // "Mínimo 10" y no "al menos 10": el mensaje de error usa esa otra
    // redacción y verlas idénticas dos veces en la misma pantalla confunde.
    label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
    message: `Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    isMet: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    // El tope no es un capricho: BCrypt trunca en silencio a partir de 72 bytes
    // y una contraseña recortada sin aviso es peor que una corta.
    id: 'maxLength',
    label: `Máximo ${PASSWORD_MAX_LENGTH} caracteres`,
    message: `No puede superar los ${PASSWORD_MAX_LENGTH} caracteres`,
    isMet: (password) => password.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: 'lowercase',
    label: 'Una letra minúscula',
    message: 'Debe incluir al menos una letra minúscula',
    isMet: (password) => /\p{Ll}/u.test(password),
  },
  {
    id: 'uppercase',
    label: 'Una letra mayúscula',
    message: 'Debe incluir al menos una letra mayúscula',
    isMet: (password) => /\p{Lu}/u.test(password),
  },
  {
    id: 'digit',
    label: 'Un dígito',
    message: 'Debe incluir al menos un dígito',
    isMet: (password) => /\d/.test(password),
  },
  {
    id: 'noPersonalData',
    label: 'Sin tu nombre ni tu correo',
    message: 'No puede contener tus datos personales',
    isMet: (password, owner) => !containsOwnerData(password, owner),
  },
];

/** Reglas incumplidas, en el orden en que se declaran. Vacío significa que la contraseña es válida. */
export function unmetPasswordRules(password: string, owner: PasswordOwner = {}): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.isMet(password, owner));
}

/**
 * El primer requisito incumplido, para el error inline de un campo. Se muestra
 * uno y no los seis: un campo con seis líneas rojas debajo no se lee, se ignora.
 */
export function firstPasswordError(
  password: string,
  owner: PasswordOwner = {},
): string | undefined {
  return unmetPasswordRules(password, owner)[0]?.message;
}

export function isPasswordValid(password: string, owner: PasswordOwner = {}): boolean {
  return unmetPasswordRules(password, owner).length === 0;
}
