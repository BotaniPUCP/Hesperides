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
