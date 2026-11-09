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

/**
 * Registro masivo (CSV), en el ciclo común de cargas. CREATE se crea; SKIP ya
 * existe y se omite; OMIT se omite porque falta su organización; ERROR impide confirmar.
 */
export type DirectoryImportKind = 'organizations' | 'contacts';
export type ImportRowAction = 'CREATE' | 'SKIP' | 'OMIT' | 'ERROR';

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
  /** Las organizaciones de la fila que no están en el Directorio. */
  missing: string[];
}

/** Una organización que falta y cuántas filas dejó fuera. */
export interface MissingOrganization {
  name: string;
  rows: number;
}

export interface DirectoryImportPlan {
  batchId: number;
  kind: DirectoryImportKind;
  totalRows: number;
  toCreate: number;
  toSkip: number;
  toOmit: number;
  errors: number;
  rows: ImportPlannedRow[];
  missingOrganizations: MissingOrganization[];
  canConfirm: boolean;
  expiresAt: string;
}

export interface DirectoryImportOutcome {
  batchId: number;
  created: number;
  skipped: number;
  omitted: number;
  missingOrganizations: MissingOrganization[];
  createdCodes: string[];
}
