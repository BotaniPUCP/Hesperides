/**
 * Espejo del `SystemParameterResponse` del backend (SPEC-003 §5): un parámetro
 * del sistema tal como lo ve quien lo administra. El `code` es la identidad
 * estable —el id numérico no lo expone la API, igual que en usuarios (SPEC-002
 * §4.9)— y `valueType` decide cómo se pinta y valida el campo.
 */

/** Tipos de valor que puede tener un parámetro (SPEC-003 §5.2). */
export type SystemParameterValueType = 'INTEGER' | 'DECIMAL' | 'STRING' | 'BOOLEAN';

export interface SystemParameter {
  code: string;
  label: string;
  /** Valor actual, siempre como texto: el backend serializa todo a String. */
  value: string;
  valueType: SystemParameterValueType;
  description: string;
  /**
   * `false` marca parámetros que el sistema necesita tal cual están: quien los
   * edita debe verlos, pero no tocarlos (SPEC-003 §5.6 se apoya en este campo
   * para no siquiera pintarlos como editables).
   */
  isEditable: boolean;
}

/**
 * Respuesta de GET /system-parameters/password-policy, que el checklist en vivo
 * del formulario de alta consume para no duplicar las cifras como constantes.
 *
 * Las dos longitudes vienen del servidor aunque solo el mínimo sea configurable:
 * el máximo es el límite de BCrypt, y tenerlo repetido aquí ya hizo que el
 * checklist anunciara un tope sin garantía de coincidir con el que valida el
 * backend.
 */
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
}

/**
 * Cuerpo de PUT /system-parameters. Actualización parcial: solo se mandan las
 * claves que van a cambiar, y el backend valida cada una según su valueType.
 */
export interface UpdateSystemParametersRequest {
  values: Record<string, string>;
}
