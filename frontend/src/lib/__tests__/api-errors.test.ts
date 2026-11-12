import { ApiError } from '../api';
import { erroresDeCampo, mensajeDeApiError } from '../api-errors';

describe('mensajeDeApiError', () => {
  it('traduce las reglas de negocio del backend en vez de mostrar su ingles', () => {
    // El backend habla en ingles tecnico a proposito (SPEC-000): mostrar
    // "Cannot deactivate the last active administrator" a quien administra el
    // campus no es informar, es delegarle la traduccion.
    expect(mensajeDeApiError(new ApiError(422, 'You cannot deactivate your own account'))).toMatch(
      /tu propia cuenta/i,
    );
    expect(
      mensajeDeApiError(new ApiError(422, 'Cannot deactivate the last active administrator')),
    ).toMatch(/último administrador/i);
    expect(mensajeDeApiError(new ApiError(409, 'Email already registered'))).toBe(
      'Ya existe un usuario con ese correo',
    );
  });

  it('distingue el cambio obligatorio de contraseña de una falta de permisos', () => {
    expect(
      mensajeDeApiError(new ApiError(403, 'Password change required before using the system')),
    ).toMatch(/cambiar tu contraseña/i);
    expect(mensajeDeApiError(new ApiError(403, 'Forbidden'))).toBe(
      'No tienes permisos para esta acción.',
    );
  });

  it('traduce el rechazo de reenviarse las credenciales a uno mismo', () => {
    expect(
      mensajeDeApiError(new ApiError(422, 'You cannot resend your own credentials')),
    ).toMatch(/tus propias credenciales/i);
  });

  describe('lugares: ningún error queda en inglés ni en el mensaje genérico', () => {
    const GENERICOS = ['La operación no cumple una regla del sistema.', 'Revisa los datos ingresados.'];

    it.each([
      [422, 'The place has no outline to locate its perspectives'],
      [400, 'The drawn outline is not a valid geometry'],
      [400, 'The drawn outline is not valid GeoJSON'],
      [422, 'The new order must list every perspective of the place exactly once; reload and try again'],
      [422, 'Only outdoor places have perspectives; add photos to the indoor place instead'],
      [422, 'The place already has a perspective of that side: edit it instead'],
      [422, 'A photo belongs to a perspective or to an indoor view, not both'],
      [422, 'Indoor views are only for indoor places'],
      [422, 'Delete the perspectives before turning the place into an indoor one'],
      [409, 'The place has places inside it: move or delete them first'],
      [422, 'A place cannot be inside one of its own places'],
      [422, 'Places can be nested at most 3 levels deep'],
      [400, 'Give one outline source: buildings, a zone, a feature, a drawing or the places inside it'],
      [422, 'An outdoor place needs an outline to be located on the map'],
      [422, 'An indoor place is located by its parent and has no outline of its own'],
      [422, 'An indoor place must be inside another place'],
      [409, 'There is already a place named «CIA» there'],
      [409, 'Building 87 already belongs to «Pabellón Z» (LUG-0004)'],
      [409, 'Reference REF-0012 was already migrated or discarded'],
      [400, 'Unknown REFERENCE_CATEGORY code: XYZ'],
      [400, 'Unknown perspective side: TOP'],
    ])('%i «%s»', (status, message) => {
      const traducido = mensajeDeApiError(new ApiError(status, message));

      expect(GENERICOS).not.toContain(traducido);
      expect(traducido).not.toBe(message);
    });

    it('conserva el dato que la persona necesita para corregir', () => {
      expect(mensajeDeApiError(new ApiError(409, 'There is already a place named «CIA» there'))).toMatch(/«CIA»/);
      expect(mensajeDeApiError(new ApiError(409, 'Building 87 already belongs to «Pabellón Z» (LUG-0004)')))
        .toMatch(/«Pabellón Z» \(LUG-0004\)/);
      expect(mensajeDeApiError(new ApiError(422, 'Places can be nested at most 3 levels deep'))).toMatch(/3 niveles/);
    });

    it('un patrón no atrapa un mensaje que solo se le parece', () => {
      expect(mensajeDeApiError(new ApiError(409, 'Building 87 is under construction'))).toBe(
        'La operación no cumple una regla del sistema.',
      );
    });
  });

  it('ante un 422 desconocido no inventa un mensaje concreto', () => {
    expect(mensajeDeApiError(new ApiError(422, 'Some future rule'))).toMatch(/regla del sistema/i);
  });

  it('nunca muestra el texto crudo de un 500', () => {
    // No dice nada util y puede filtrar detalles internos (SPEC-C02 §11).
    const mensaje = mensajeDeApiError(new ApiError(500, 'NullPointerException at line 42'));

    expect(mensaje).not.toMatch(/NullPointer/);
    expect(mensaje).toMatch(/error del servidor/i);
  });

  it('deja pasar el mensaje de red, que ya viene redactado desde api.ts', () => {
    expect(mensajeDeApiError(new ApiError(0, 'Sin conexión. Verifique su red.'))).toBe(
      'Sin conexión. Verifique su red.',
    );
  });

  it('distingue el 403 del 401: uno no tiene permiso, el otro ya no tiene sesion', () => {
    expect(mensajeDeApiError(new ApiError(403, 'Insufficient permissions'))).toMatch(/permisos/i);
    expect(mensajeDeApiError(new ApiError(401, 'Invalid or expired token'))).toMatch(/sesión/i);
  });

  it('ante algo que no es un ApiError no finge saber que paso', () => {
    expect(mensajeDeApiError(new TypeError('boom'))).toMatch(/inesperado/i);
  });
});

describe('erroresDeCampo', () => {
  it('extrae los errores por campo de un 400 de validacion', () => {
    const error = new ApiError(400, 'Validation failed', {
      errors: [{ field: 'email', message: 'must be a well-formed email address' }],
    });

    expect(erroresDeCampo(error)).toEqual([
      { field: 'email', message: 'must be a well-formed email address' },
    ]);
  });

  it('devuelve vacio cuando el 400 es un mensaje suelto sin campo', () => {
    // Los de ValidationException (politica de contrasenas, contrasena actual
    // incorrecta) no traen campo: no hay donde pintarlos.
    expect(erroresDeCampo(new ApiError(400, 'Current password is incorrect'))).toEqual([]);
  });

  it('no busca campos en un error que no es 400', () => {
    expect(erroresDeCampo(new ApiError(409, 'Email already registered'))).toEqual([]);
    expect(erroresDeCampo(new Error('boom'))).toEqual([]);
  });
});
