/**
 * Quién hace qué en incidencias. El backend aplica las mismas reglas; aquí solo
 * se decide qué mostrar, para no ofrecer acciones que el servidor rechazaría.
 *
 * Administración tiene en incidencias los mismos permisos que coordinación.
 */

export const INCIDENT_MEMBER_ROLES = ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'] as const;
const MANAGER_ROLES: readonly string[] = ['ADMIN', 'COORDINADOR'];

/** Entra al módulo: informa, consulta y comenta según su alcance (el operario, solo lo suyo). */
export function canUseIncidents(role: string | undefined): boolean {
  return role !== undefined && (INCIDENT_MEMBER_ROLES as readonly string[]).includes(role);
}

/** Ve todas, revisa, activa, vincula intervenciones y cierra (SPEC-201 §3.1). */
export function managesIncidents(role: string | undefined): boolean {
  return role !== undefined && MANAGER_ROLES.includes(role);
}
