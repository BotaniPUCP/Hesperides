export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/**
 * Roles asignables desde la gestión de usuarios. Coinciden con catalog_items.code
 * del catálogo ROLE y con RoleCodes del backend.
 *
 * Están aquí y no pedidos a la API porque el endpoint de catálogos es de SPEC-003
 * y todavía no existe. Cuando exista, esta constante se reemplaza por esa llamada
 * y nada más cambia: los componentes ya consumen una lista de opciones.
 *
 * USER no aparece: es el rol base sembrado por la migración, no uno que un
 * administrador asigne.
 */
export const ASSIGNABLE_ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'COORDINADOR', label: 'Coordinador' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'OPERARIO', label: 'Operario de campo' },
] as const;

/** Tamaño de página del listado. Coincide con el @PageableDefault del backend. */
export const USERS_PAGE_SIZE = 20;

/** Mínimo de la política de contraseñas (SPEC-100 §9.1), replicado para validar antes de enviar. */
export const PASSWORD_MIN_LENGTH = 10;

/**
 * Tope de la política (SPEC-100 §9.1). Es el límite real de BCrypt: más allá de
 * 72 bytes trunca en silencio, y una contraseña truncada sin aviso es peor que
 * una corta.
 */
export const PASSWORD_MAX_LENGTH = 72;

/** Espera antes de consultar el listado mientras se escribe en el buscador (SPEC-100 §7.1). */
export const SEARCH_DEBOUNCE_MS = 300;
