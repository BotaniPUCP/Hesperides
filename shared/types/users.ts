/**
 * Espejo de los DTOs de SPEC-100. Cada campo existe en UserDetailResponse del
 * backend: nada aquí es aspiracional.
 *
 * Ningún tipo de este archivo tiene un campo de contraseña o hash. No es un
 * descuido, es la misma garantía que aplica el backend: lo que no se declara no
 * se puede mostrar por accidente.
 */

/** Rol del usuario. Es una fila de catalog_items, nunca un enum (SPEC-003). */
export interface Role {
  id: number;
  code: string;
  label: string;
}

/** Cuadrilla a la que pertenece un usuario, resumida dentro de su ficha. */
export interface TeamSummary {
  id: number;
  name: string;
}

/**
 * Estado de entrega de credenciales. Es metadato del sistema, no un catálogo de
 * dominio, por eso el backend sí lo modela como enum.
 */
export type CredentialStatus = 'PENDING_DELIVERY' | 'DELIVERED';

/** Ficha completa de un usuario, tal como la devuelve GET /users y GET /users/{id}. */
export interface UserDetail {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  credentialStatus: CredentialStatus;
  mustChangePassword: boolean;
  lastLogin: string | null;
  teams: TeamSummary[];
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo de POST /users. El ADMIN escribe la contraseña inicial (SPEC-100 §2.7). */
export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
  initialPassword: string;
}

/**
 * Cuerpo de PUT /users/{id}. Sin contraseña a propósito: la clave de una cuenta
 * existente no se fija, se regenera con resend-credentials (SPEC-100 §2.7).
 */
export interface UpdateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
}

/** Cuerpo de POST /users/me/password. */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Respuesta de POST /users/{id}/resend-credentials. Nunca trae la contraseña generada. */
export interface CredentialDelivery {
  id: number;
  email: string;
  credentialStatus: CredentialStatus;
}

/** Filtros de GET /users. Un campo ausente significa "sin filtrar por esto". */
export interface UserFilters {
  search?: string;
  roleCode?: string;
  isActive?: boolean;
  teamId?: number;
}
