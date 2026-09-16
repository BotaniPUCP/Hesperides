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
 * Cuerpo de PUT /system-parameters. Actualización parcial: solo se mandan las
 * claves que van a cambiar, y el backend valida cada una según su valueType.
 */
export interface UpdateSystemParametersRequest {
  values: Record<string, string>;
}
