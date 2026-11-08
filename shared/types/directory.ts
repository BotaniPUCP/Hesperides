/** SPEC-106: el Directorio de organizaciones y contactos. Espejo de DirectoryResponses del backend. */

export type OrganizationTypeCode = 'PUCP_UNIT' | 'EXTERNAL_COMPANY';

export interface DirectoryCodeLabel {
  code: string;
  label: string;
}

export interface DirectoryPage<T> {
  page: number;
  size: number;
  total: number;
  items: T[];
}

/** `active` en false: dada de baja, pero sigue apareciendo en lo que ya la usaba. */
export interface OrganizationRef {
  code: string;
  name: string;
  active: boolean;
}

export interface OrganizationSummary {
  code: string;
  name: string;
  type: DirectoryCodeLabel;
  phone: string | null;
  contactCount: number;
}

export interface ContactCard {
  code: string;
  fullName: string;
  extension: string | null;
  mobile: string | null;
  email: string | null;
}

export interface OrganizationDetail {
  code: string;
  name: string;
  type: DirectoryCodeLabel;
  ruc: string | null;
  phone: string | null;
  aliases: string[];
  active: boolean;
  contacts: ContactCard[];
}

export interface OrganizationSuggestion {
  code: string;
  name: string;
}

export interface ContactSummary extends ContactCard {
  organizations: OrganizationRef[];
}

export interface ContactDetail extends ContactSummary {
  active: boolean;
  hasActiveOrganization: boolean;
}

export interface OrganizationInput {
  name: string;
  typeCode: OrganizationTypeCode;
  ruc: string | null;
  phone: string | null;
  aliases: string[];
}

export interface ContactInput {
  fullName: string;
  organizationCodes: string[];
  extension: string | null;
  mobile: string | null;
  email: string | null;
}

/** Registro masivo (CSV). CREATE se crea, SKIP ya existe, ERROR impide confirmar. */
export type DirectoryImportKind = 'organizaciones' | 'contactos';
export type ImportRowAction = 'CREATE' | 'SKIP' | 'ERROR';

export interface ImportRowIssue {
  line: number;
  column: string;
  code: string;
  detail: string | null;
}

export interface ImportPlannedRow {
  line: number;
  name: string | null;
  action: ImportRowAction;
  issues: ImportRowIssue[];
}

export interface DirectoryImportPlan {
  kind: DirectoryImportKind;
  rows: ImportPlannedRow[];
  creates: number;
  skips: number;
  errors: number;
}

export interface DirectoryImportOutcome {
  created: number;
  skipped: number;
}
