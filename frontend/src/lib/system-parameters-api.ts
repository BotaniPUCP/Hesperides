import type { PasswordPolicy, SystemParameter } from '@shared/types';
import { apiClient } from './api';

/**
 * Endpoints de SystemParameters (SPEC-A7). La pantalla edita parámetros del
 * sistema comunes a toda la aplicación, así que estas funciones solo las llama
 * una pantalla ADMIN que ya se sabe autorizada; el backend igual exige el rol
 * (SPEC-001 Anexo A).
 */
export const systemParametersApi = {
  /** Lista completa: códigos, valores actuales y metadatos de cada uno. */
  getAll: () => apiClient.get<SystemParameter[]>('/system-parameters'),

  /**
   * La longitud mínima que exige la política de contraseña. A diferencia del
   * resto de este módulo, sí la consume cualquier usuario autenticado (el
   * checklist de alta y el de cambio de contraseña la pintan en vivo).
   */
  getPasswordPolicy: () =>
    apiClient.get<PasswordPolicy>('/system-parameters/password-policy'),

  /**
   * Actualización parcial: el backend solo toca las claves presentes. Quien
   * cambió un valor no necesita reenviar —ni arriesgar— los que dejó igual.
   */
  update: (values: Record<string, string>) =>
    apiClient.put<SystemParameter[]>('/system-parameters', { values }),
};
