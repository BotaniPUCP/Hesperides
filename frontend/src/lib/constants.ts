export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/**
 * Codigos de catalogo que el frontend nombra explicitamente. No son la lista de
 * valores —esa la sirve la API (SPEC-003)— sino las claves con las que se pide.
 */
export const CATALOG_ROLE = 'ROLE';
export const CATALOG_INTERVENTION_CLASS = 'INTERVENTION_CLASS';
export const CATALOG_INTERVENTION_TYPE = 'INTERVENTION_TYPE';

/**
 * Vigencia del cache de catalogos (SPEC-003 §6.2). Cinco minutos evita pedir el
 * mismo catalogo en cada formulario sin dejar la UI desactualizada por horas:
 * un administrador edita items de vez en cuando, no cada minuto.
 */
export const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

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
