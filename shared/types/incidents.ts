// Contratos de SPEC-201 (rediseño del 15 nov 2026). Espejo de IncidentContracts.java.

export interface IncidentOption { id: number; code: string; label: string }
export interface IncidentTypeOption extends IncidentOption { classCode: string | null }
export interface IncidentPerson { id: number; fullName: string }
export interface IncidentTeam { id: number; name: string }
export interface IncidentZone { id: number; code: string; name: string }
/** El Directorio se referencia por código, nunca por id (SPEC-002 INV-04). */
export interface IncidentOrganization { code: string; name: string }
export interface IncidentRequester {
  organizationCode: string | null; organizationName: string | null; name: string | null;
  contactCode: string | null; contactName: string | null;
}

export type IncidentStatusCode = 'REPORTED' | 'IN_PROGRESS' | 'CLOSED';
export type DeadlineStatus = 'ON_TIME' | 'DUE_SOON' | 'OVERDUE';
export type HeightClass = 'UNDER_5M' | 'OVER_5M' | 'UNCLASSIFIED' | 'NOT_APPLICABLE';
export type PrefillStatus = 'NOT_REQUESTED' | 'PENDING' | 'READY' | 'FAILED';
export type ClosureBlocker = 'NOT_ACTIVE' | 'NO_LINKED_WORK' | 'WORK_NOT_VALIDATED' | 'CANCELLED_WORK';
export type ActivationGap = 'TYPE' | 'URGENCY' | 'LOCATION' | 'PROVIDER' | 'AGREED_DAYS' | 'TALL_TREE_NEEDS_THIRD_PARTY';
export type PrefillWarning = 'VERIFY_HEIGHT' | 'LOW_CONFIDENCE';

/** Solo descripción y gravedad son obligatorias (§3.2). */
export interface IncidentCapture {
  description: string;
  reportedUrgencyCode: string;
  locationReference: string | null;
  latitude: number | null;
  longitude: number | null;
  zoneId: number | null;
  requestedByOrganizationCode: string | null;
  requestedByName: string | null;
  requesterContactCode: string | null;
  requestedForOrganizationCode: string | null;
  sourceCode: string | null;
  externalCode: string | null;
}

/** Coordinación puede modificar todo (§3.6). */
export interface IncidentReview {
  version: number;
  title: string | null;
  description: string;
  urgencyCode: string | null;
  typeCode: string | null;
  zoneId: number | null;
  locationReference: string | null;
  latitude: number | null;
  longitude: number | null;
  teamId: number | null;
  thirdParty: boolean;
  providerOrganizationCode: string | null;
  agreedDays: number | null;
  heightClass: HeightClass | null;
  requestedByOrganizationCode: string | null;
  requestedByName: string | null;
  requesterContactCode: string | null;
  requestedForOrganizationCode: string | null;
  sourceCode: string | null;
  externalCode: string | null;
}

export interface IncidentDeadline { dueAt: string; status: DeadlineStatus | null; met: boolean | null }

export interface Incident {
  id: number;
  code: string;
  title: string | null;
  originalDescription: string;
  description: string;
  reportedUrgency: IncidentOption | null;
  urgency: IncidentOption | null;
  type: IncidentOption | null;
  status: IncidentOption;
  active: boolean;
  zone: IncidentZone | null;
  locationReference: string | null;
  latitude: number | null;
  longitude: number | null;
  team: IncidentTeam | null;
  thirdParty: boolean;
  provider: IncidentOrganization | null;
  agreedDays: number | null;
  heightClass: HeightClass | null;
  requestedBy: IncidentRequester;
  requestedFor: IncidentOrganization | null;
  source: IncidentOption | null;
  externalCode: string | null;
  reportedBy: IncidentPerson;
  activatedBy: IncidentPerson | null;
  activatedAt: string | null;
  closedBy: IncidentPerson | null;
  closedAt: string | null;
  resolutionSummary: string | null;
  deadline: IncidentDeadline | null;
  createdAt: string;
  version: number;
  editedFields: string[];
  /** Código, título, descripción y referencia sin tildes: en qué se busca (SPEC-119 D-01). */
  searchKey: string;
}

export interface IncidentSuggestion {
  title?: string | null;
  typeCode?: string | null;
  zoneId?: number | null;
  reference?: string | null;
  thirdParty?: boolean;
  heightClass?: HeightClass;
  imminentRisk?: boolean;
  imminentReason?: string | null;
  plan?: string | null;
  justification?: string | null;
  confidence?: number;
}

export interface IncidentPrefill {
  status: PrefillStatus;
  suggestion: IncidentSuggestion | null;
  suggestedUrgencyCode: string | null;
  suggestsThirdParty: boolean;
  warnings: PrefillWarning[];
  updatedAt: string | null;
}

export interface LinkedIncidentIntervention {
  linkId: number | null; id: number; code: string | null; description: string | null;
  statusCode: string; locationCount: number; validatedLocationCount: number;
}
export interface IncidentSimilarCase { id: number; code: string; title: string | null; resolutionSummary: string }
export interface IncidentHistoryEntry { id: number; status: IncidentOption; changedBy: IncidentPerson; createdAt: string }
export interface IncidentUpdate { id: number; author: IncidentPerson; kind: IncidentOption; body: string; createdAt: string }
export interface IncidentPhoto { id: number; contentType: string; sizeBytes: number; createdAt: string }
export interface IncidentCapabilities {
  canEdit: boolean; canActivate: boolean; canLink: boolean; canClose: boolean;
  canRetryPrefill: boolean; canComment: boolean; canAddPhoto: boolean;
}

export interface IncidentDetail {
  incident: Incident;
  prefill: IncidentPrefill;
  linkedInterventions: LinkedIncidentIntervention[];
  closureBlockers: ClosureBlocker[];
  activationGaps: ActivationGap[];
  similarCases: IncidentSimilarCase[];
  history: IncidentHistoryEntry[];
  photos: IncidentPhoto[];
  updates: IncidentUpdate[];
  capabilities: IncidentCapabilities;
}

export interface IncidentMine { total: number; notActive: number; open: number; closed: number; recent: Incident[] }

export interface IncidentOptions {
  urgencies: IncidentOption[];
  classes: IncidentOption[];
  types: IncidentTypeOption[];
  statuses: IncidentOption[];
  sources: IncidentOption[];
  heightClasses: HeightClass[];
  teams: IncidentTeam[];
  sections: IncidentZone[];
  defaultRequesterName: string;
}

/** Lo mínimo para buscar una incidencia desde Intervenciones. */
export interface IncidentRef { id: number; code: string; title: string | null; statusCode: string; active: boolean; searchKey: string }

/** Una intervención no cancelada que se puede vincular; `searchKey`: código y descripción sin tildes (SPEC-119). */
export interface InterventionCandidate { id: number; code: string; description: string | null; statusCode: string; searchKey: string }

export interface IncidentMapMarker {
  id: number; code: string; title: string | null; latitude: number; longitude: number;
  urgencyCode: string | null; deadlineStatus: DeadlineStatus | null;
}
export interface IncidentMap { markers: IncidentMapMarker[]; withoutLocation: number }
