import { firstPasswordError, isPasswordValid, unmetPasswordRules } from '../password-policy';

const DUENO = { email: 'ana.torres@pucp.edu.pe', firstName: 'Ana', lastName: 'Torres' };

describe('password-policy', () => {
  it('acepta una contrasena que cumple los seis requisitos', () => {
    expect(isPasswordValid('JardinSeguro7', DUENO)).toBe(true);
    expect(unmetPasswordRules('JardinSeguro7', DUENO)).toEqual([]);
  });

  it('exige minuscula, mayuscula y digito por separado', () => {
    expect(unmetPasswordRules('sinmayusculas1').map((r) => r.id)).toEqual(['uppercase']);
    expect(unmetPasswordRules('SINMINUSCULAS1').map((r) => r.id)).toEqual(['lowercase']);
    expect(unmetPasswordRules('SinDigitosAqui').map((r) => r.id)).toEqual(['digit']);
  });

  it('rechaza por debajo de 10 y por encima de 72 caracteres', () => {
    // El tope no es un capricho: BCrypt trunca en silencio a partir de 72 bytes
    // y una contrasena recortada sin aviso es peor que una corta.
    expect(unmetPasswordRules('Corta123').map((r) => r.id)).toContain('minLength');
    expect(unmetPasswordRules(`A1${'a'.repeat(71)}`).map((r) => r.id)).toContain('maxLength');
  });

  it('rechaza la contrasena que contiene el nombre o el correo de su dueno', () => {
    expect(isPasswordValid('AnaJardin123', DUENO)).toBe(false);
    expect(isPasswordValid('TorresJardin1', DUENO)).toBe(false);
    expect(isPasswordValid('Ana.torres2026', DUENO)).toBe(false);
  });

  it('ignora fragmentos personales de menos de tres letras', () => {
    // Un nombre de una o dos letras apareceria por azar en casi cualquier
    // contrasena y bloquearia claves legitimas. Es el mismo umbral del backend.
    expect(isPasswordValid('JardinSeguro7', { firstName: 'Jo' })).toBe(true);
  });

  it('no exige datos del dueno para poder validar', () => {
    // El cambio de la propia contrasena no siempre los tiene a mano: en ese
    // caso se omite esa comprobacion, no la politica entera.
    expect(isPasswordValid('JardinSeguro7')).toBe(true);
    expect(isPasswordValid('corta')).toBe(false);
  });

  it('devuelve un solo mensaje de error, no los seis', () => {
    // Un campo con seis lineas rojas debajo no se lee, se ignora.
    expect(firstPasswordError('corta')).toBe('Debe tener al menos 10 caracteres');
    expect(firstPasswordError('JardinSeguro7')).toBeUndefined();
  });
});
