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
  'Started work cannot be removed from required interventions': 'El trabajo ya comenzó. Debe completar su ejecución y revisión; no puede retirarse para evitar la validación.',
  'Invalid incident request': 'Revisa los datos: el motivo o resumen no puede quedar vacío y debe respetar los límites.',
  'Resubmit the report before registration': 'El remitente debe corregir y reenviar el reporte antes del registro oficial.',
  'Official registration cannot be returned for initial correction': 'La incidencia ya está registrada; utiliza las observaciones de atención o resolución.',
  'Official registration cannot be edited by the reporter': 'La incidencia ya fue registrada oficialmente y no admite corrección del reporte por el remitente.',
  'The report has not been returned for correction': 'Este reporte no tiene una solicitud de corrección pendiente.',
  'Resolution already recorded with another summary': 'La resolución ya fue registrada con otro resumen. Actualiza el detalle.',
  'Validate all required interventions and map legacy work before closing': 'Vincula al menos una intervención, valida todas las requeridas y asocia los trabajos anteriores antes de cerrar.',
  'Use the intervention module; legacy work is read-only': 'Los trabajos anteriores son de solo lectura. Registra o consulta la ejecución en el módulo de intervenciones.',
  'Intervention changed; reload before linking': 'La intervención cambió. Actualiza la selección antes de vincularla.',
  'Intervention is already linked with another purpose': 'Esta intervención ya está vinculada con otro propósito. Revisa los vínculos existentes.',
  'Legacy work does not belong to this incident': 'Uno de los registros anteriores no pertenece a esta incidencia.',
  'Legacy work is already mapped to another intervention': 'Ese registro anterior ya está asociado a otra intervención.',
  'Cancelled interventions cannot be required work': 'Una intervención cancelada no puede vincularse como trabajo requerido.',
  'Linked intervention is unavailable': 'Una intervención requerida ya no está disponible. El cierre no puede completarse.',
  'Complete the declared mitigation and prevention actions before resolving': 'Registra y completa las acciones de mitigación y prevención declaradas antes de cerrar.',
  'Subprocess does not belong to process': 'El subproceso no corresponde al proceso N2 seleccionado.',
  'Invalid responsible person': 'La persona responsable ya no está disponible. Actualiza la selección.',
  'Incident changed; reload before editing': 'La incidencia cambió. Actualiza el detalle antes de guardar o aprobar.',
  'Incident already resolved': 'La incidencia ya está resuelta.',
  'Incident approval required': 'El coordinador debe aprobar el registro antes de iniciar su atención.',
  'Complete the interventions before resolving': 'Registra al menos una intervención realizada y completa las pendientes antes de resolver.',
  'Request reference already used with different content': 'Este envío ya fue recibido con otro contenido. Actualiza el detalle antes de continuar.',
  'Invalid coordinates': 'Revisa la latitud y longitud, o quita la ubicación para continuar.',
  'Invalid catalog item': 'La opción seleccionada ya no está disponible. Actualiza la pantalla.',
  'Invalid team': 'La cuadrilla seleccionada ya no está disponible.',
  'Photo limit reached': 'Esta incidencia ya tiene seis fotografías.',
  'Invalid photo size': 'La fotografía debe pesar entre 1 byte y 5 MiB.',
  'Unsupported photo format': 'Usa una fotografía JPEG, PNG o WebP.',
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

  // SPEC-003. Estos ya llegan en español desde el backend, pero pasan por el
  // diccionario igual: es el unico sitio donde se decide que lee el usuario, y
  // dejarlos fuera los haria caer en el mensaje generico.
  'Este ítem es requerido por el sistema y no puede desactivarse':
    'Ese ítem lo necesita el sistema para funcionar: no se puede desactivar.',
  'El padre debe pertenecer a un catálogo distinto: la jerarquía es de dos niveles':
    'La clase debe venir de otro catálogo: la jerarquía admite solo dos niveles.',
};

/**
 * SPEC-203: conjuntos de áreas verdes y frecuencias por conjunto. Ya llegan en
 * español; están aquí porque este diccionario decide qué lee el usuario.
 */
const MENSAJES_PLANIFICACION: Record<string, string> = {
  'Ya existe un conjunto con ese nombre': 'Ya existe un conjunto con ese nombre.',
  'El nombre del conjunto es obligatorio': 'Ponle un nombre al conjunto.',
  'Elige al menos un jardín': 'Elige al menos un jardín.',
  'Elige al menos una actividad': 'Elige al menos una actividad que se planifique en este conjunto.',
  'Otra persona cambió este conjunto. Recarga para ver su versión.':
    'Otra persona cambió este conjunto. Recarga para ver su versión.',
  'Quita primero la frecuencia propia de este conjunto':
    'Este conjunto tiene una frecuencia propia. Quítala primero desde Frecuencias.',
  'Conjunto no encontrado': 'El conjunto no existe o ya fue dado de baja.',
  'Elige el conjunto al que se aplica esta frecuencia': 'Elige el conjunto al que se aplica esta frecuencia.',
  'El conjunto no existe o fue dado de baja': 'El conjunto ya no existe o fue dado de baja.',
  'Solo una frecuencia propia de un conjunto lleva conjunto':
    'Una frecuencia de todo el campus no lleva conjunto.',
  'Ya existe una frecuencia vigente para esta actividad, modalidad y ámbito':
    'Ya hay una frecuencia vigente para esta actividad, modalidad y alcance.',
};

/** Mensajes que traen datos al final («…: 7, 9»): se reconocen por su comienzo. */
const PREFIJOS: ReadonlyArray<[string, string]> = [
  ['Solo se pueden agregar secciones: ', 'Solo se pueden agregar jardines. Revisa la selección.'],
  ['Actividades no válidas: ', 'Alguna actividad elegida ya no existe. Recarga la página.'],
];

function traducir(message: string, porDefecto: string): string {
  const exacto = MENSAJES[message] ?? MENSAJES_PLANIFICACION[message];
  if (exacto) return exacto;
  return PREFIJOS.find(([prefijo]) => message.startsWith(prefijo))?.[1] ?? porDefecto;
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
      return 'No se encontró el registro o no tienes acceso a él.';
    case 413:
      return 'La carga supera el tamaño máximo permitido.';
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
