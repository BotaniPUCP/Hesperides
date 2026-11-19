import { ApiError } from '../api';
import { mensajeDeApiError } from '../api-errors';

const fallo = (status: number, message: string) => new ApiError(status, message, null);

describe('errores del Directorio en español (SPEC-106 §5.3)', () => {
  it.each([
    [409, 'The name or an alias is already used by «Estudios Generales Ciencias»',
      'Ese nombre o alias ya lo usa «Estudios Generales Ciencias». Elige esa organización o usa otro nombre.'],
    [409, 'Another organization already has RUC 20123456789', 'Otra organización ya tiene el RUC 20123456789.'],
    [422, 'A PUCP unit has no RUC; only external companies do', 'Una unidad PUCP no lleva RUC; solo las empresas externas.'],
    [400, 'The RUC must have 11 digits and start with 10 or 20', 'El RUC debe tener 11 dígitos y empezar con 10 o 20.'],
    [422, 'The organization ORG-0003 is deactivated', 'La organización ORG-0003 está dada de baja. Elige otra o pide que la reactiven.'],
    [422, 'The contact CON-0007 is deactivated', 'El contacto CON-0007 está dado de baja.'],
    [409, 'The contact CON-0007 already belongs to «OIE»', 'El contacto ya pertenece a «OIE».'],
    [400, 'The extension must have 4 digits', 'El anexo debe tener 4 dígitos.'],
    [400, 'The mobile must have 9 digits and start with 9', 'El celular debe tener 9 dígitos y empezar con 9.'],
    [422, 'A contact must belong to at least one active organization', 'Un contacto debe pertenecer al menos a una organización vigente.'],
    [400, 'Unknown organization type: SECRET', 'El tipo de organización elegido no es válido. Actualiza la pantalla.'],
  ])('traduce un %i «%s»', (status, backend, esperado) => {
    expect(mensajeDeApiError(fallo(status, backend))).toBe(esperado);
  });
});
