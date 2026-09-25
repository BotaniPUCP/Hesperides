import type { SystemParameter } from '@shared/types';

/**
 * Réplica del contrato de GET /system-parameters. Los tests fijan aquí la
 * respuesta en vez de llamar a la red: mismas cifras que la semilla V012.
 */
export const PARAMETROS_DE_PRUEBA: SystemParameter[] = [
  {
    code: 'PASSWORD_MIN_LENGTH',
    label: 'Longitud mínima de contraseña',
    value: '10',
    valueType: 'INTEGER',
    description: 'Cantidad mínima de caracteres que debe tener la contraseña de un usuario',
    isEditable: true,
  },
];

export const systemParametersApi = {
  getAll: jest.fn(async () => PARAMETROS_DE_PRUEBA),
  getPasswordPolicy: jest.fn(async () => ({ minLength: 12, maxLength: 72 })),
  update: jest.fn(),
};