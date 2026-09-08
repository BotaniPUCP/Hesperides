import type { CredentialStatus, SessionUser, TeamSummary } from '@/lib/auth-context';

/**
 * Fila del listado de usuarios (SPEC-100 §3.2). Es la ficha que devuelve el
 * backend por cada elemento de UsersPage.content, con los campos de
 * creación/actualización añadidos sobre SessionUser.
 */
export interface UserRow extends SessionUser {
  createdAt: string;
  updatedAt: string;
}

export interface RoleSelector {
  id: number;
  code: string;
  label: string;
}

/** Payload de POST /users (SPEC-100 §3.3). */
export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
  initialPassword: string;
}

/** Payload de PUT /users/{id} (SPEC-100 §3.5). Sin contraseña a propósito (§2.7). */
export interface UpdateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
}

export interface CredentialsDeliveryResult {
  id: number;
  email: string;
  credentialStatus: CredentialStatus;
}

/** Payload de POST /users/me/password (SPEC-100 §3.10). */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Filtros del listado (SPEC-100 §3.1). teamId queda listo para cuadrillas. */
export interface UsersFilters {
  search: string;
  roleCode: string | null;
  isActive: boolean | null;
  teamId: number | null;
}

/** Estado sin filtros: "Activos" preseleccionado (SPEC-100 §7.1). */
export const INITIAL_FILTERS: UsersFilters = {
  search: '',
  roleCode: null,
  isActive: true,
  teamId: null,
};

export function isFiltersEmpty(filters: UsersFilters): boolean {
  return (
    filters.search === '' &&
    filters.roleCode === null &&
    filters.isActive === null &&
    filters.teamId === null
  );
}