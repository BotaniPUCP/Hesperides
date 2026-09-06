/**
 * Audit fields present on every table (SPEC-000, section 5.4).
 * Domain entities are defined by SPEC-002 and extend this.
 */
export interface AuditFields {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
