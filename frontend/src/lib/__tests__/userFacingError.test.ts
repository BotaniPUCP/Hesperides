import { UserFacingError, userFacingMessage } from '../userFacingError';

describe('mensajes propios para la persona', () => {
  it('un UserFacingError se muestra tal cual: lo redactamos en español', () => {
    expect(userFacingMessage(new UserFacingError('Archivo demasiado grande.'), 'genérico')).toBe('Archivo demasiado grande.');
  });

  it('cualquier otro error muestra el texto genérico: puede venir en inglés técnico', () => {
    expect(userFacingMessage(new SyntaxError('Unexpected token < in JSON at position 0'), 'Archivo inválido.')).toBe('Archivo inválido.');
    expect(userFacingMessage(new Error('Failed to fetch'), 'No se pudo cargar.')).toBe('No se pudo cargar.');
    expect(userFacingMessage('texto suelto', 'genérico')).toBe('genérico');
    expect(userFacingMessage(undefined, 'genérico')).toBe('genérico');
  });

  it('sigue siendo un Error, con su nombre', () => {
    const error = new UserFacingError('x');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UserFacingError');
  });
});
