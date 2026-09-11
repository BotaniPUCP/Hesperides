import type { FieldError, ValidationErrors } from '@shared/types';
import { ApiError } from './api';

/**
 * Traduce un fallo de la API a algo que una persona pueda leer y accionar,
 * siguiendo la tabla de SPEC-C02 §6.
 *
 * El backend habla en inglés técnico a propósito (SPEC-000): traducir es
 * trabajo del frontend. Por eso hay un diccionario y no un `error.message`
 * pasado tal cual: mostrar "Cannot deactivate the last active administrator" a
 * quien administra el campus no es informar, es delegarle la traducción.
 */

/** Mensajes de regla de negocio (422) y conflicto (409) de SPEC-100 §3. */
const MENSAJES: Record<string, string> = {
  'Email already registered': 'Ya existe un usuario con ese correo',
  'You cannot deactivate your own account': 'No puedes desactivar tu propia cuenta.',
  'Cannot deactivate the last active administrator':
    'Es el último administrador activo. Nombra a otro antes de desactivarlo.',
  'Cannot change the role of the last active administrator':
    'Es el último administrador activo. Nombra a otro antes de cambiarle el rol.',
  'Cannot send credentials to an inactive user':
    'No se pueden enviar credenciales a una cuenta desactivada. Reactívala primero.',
  'User credentials are not pending delivery':
    'Esa cuenta ya figura con las credenciales entregadas.',
  'Current password is incorrect': 'La contraseña actual es incorrecta',
  'New password must be different from the current one':
    'La contraseña nueva debe ser distinta de la actual.',
};

function traducir(message: string, porDefecto: string): string {
  return MENSAJES[message] ?? porDefecto;
}

export function mensajeDeApiError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }

  switch (error.status) {
    // status 0 es "fetch no llegó a recibir respuesta". El mensaje ya viene
    // redactado desde api.ts y es deliberadamente ambiguo: quien lo lee no
    // puede hacer nada distinto si la causa real fue CORS (SPEC-C02 §6.0).
    case 0:
      return error.message;
    case 401:
      return 'Tu sesión expiró, vuelve a iniciar sesión.';
    case 403:
      return 'No tienes permisos para esta acción.';
    case 404:
      return 'Ese usuario ya no existe. Puede que alguien lo haya eliminado.';
    case 409:
    case 422:
      // El 422 es una regla del dominio que la persona debe entender, no un
      // fallo del sistema: su mensaje se muestra, traducido.
      return traducir(error.message, 'La operación no cumple una regla del sistema.');
    case 400:
      return traducir(error.message, 'Revisa los datos ingresados.');
    default:
      // Un 500 nunca muestra el texto del backend: no dice nada útil y puede
      // filtrar detalles internos (SPEC-C02 §11).
      return 'Error del servidor. Intente más tarde.';
  }
}

/**
 * Los errores por campo de un 400 de Bean Validation. Vacío si el 400 no los
 * trae (los de `ValidationException` son un mensaje suelto, sin campo).
 */
export function erroresDeCampo(error: unknown): FieldError[] {
  if (!(error instanceof ApiError) || error.status !== 400) return [];

  const data = error.data as ValidationErrors | null;
  if (data === null || !Array.isArray(data.errors)) return [];

  return data.errors;
}
