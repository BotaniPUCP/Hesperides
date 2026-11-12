export interface IncidentOption { id: number; code: string; label: string }
export interface IncidentPerson { id: number; fullName: string }
export interface IncidentTeam { id: number; name: string }

export interface IncidentCapture {
  description: string;
  locationReference: string | null;
  latitude: number | null;
  longitude: number | null;
}
export interface IncidentReview extends IncidentCapture {
  version: number;
  typeCode: string | null;
  urgencyCode: string | null;
  teamId: number | null;
  matrix?: IncidentMatrixReview;
}
export interface IncidentMatrixReview {
  serviceCode: string | null;
  companyCode: string | null;
  processCode: string | null;
  subprocessCode: string | null;
  severityCode: string | null;
  impactCodes: string[];
  responsibleUserId: number | null;
  immediateAction: string | null;
  rootCauseCode: string | null;
  rootCause: string | null;
  preventiveAction: string | null;
  impactedProcess: string | null;
  observations: string | null;
}
export interface IncidentMatrix {
  event: IncidentOption | null;
  serviceGroup: IncidentOption | null;
  service: IncidentOption | null;
  company: IncidentOption | null;
  process: IncidentOption | null;
  subprocess: IncidentOption | null;
  severity: IncidentOption | null;
  impacts: IncidentOption[];
  responsible: IncidentPerson | null;
  immediateAction: string | null;
  rootCauseItem: IncidentOption | null;
  rootCause: string | null;
  preventiveAction: string | null;
  impactedProcess: string | null;
  observations: string | null;
}
export interface IncidentMatrixOption extends IncidentOption { parentCode: string | null; description: string | null }
export interface IncidentMatrixOptions {
  services: IncidentMatrixOption[];
  companies: IncidentMatrixOption[];
  processes: IncidentMatrixOption[];
  subprocesses: IncidentMatrixOption[];
  severities: IncidentMatrixOption[];
  impacts: IncidentMatrixOption[];
  rootCauses: IncidentMatrixOption[];
  actionPurposes: IncidentMatrixOption[];
  responsiblePeople: IncidentPerson[];
}
export interface IncidentDistribution { label: string; count: number }
export interface IncidentMatrixSummary {
  pendingActions: number;
  closedWithDuration: number;
  averageClosureBusinessDays: number | null;
  severities: IncidentDistribution[];
  impacts: IncidentDistribution[];
  services: IncidentDistribution[];
  responsiblePeople: IncidentDistribution[];
}
export interface IncidentUpdate {
  id: number;
  author: IncidentPerson;
  kind: IncidentOption;
  body: string;
  createdAt: string;
}
export interface IncidentMatrixExport { filename: string; contentType: string; content: string }
export interface Incident extends IncidentCapture {
  id: number;
  originalDescription: string;
  type: IncidentOption | null;
  urgency: IncidentOption | null;
  status: IncidentOption;
  reportedBy: IncidentPerson;
  team: IncidentTeam | null;
  approvedBy: IncidentPerson | null;
  approvedAt: string | null;
  resolvedAt: string | null;
  channel: string;
  createdAt: string;
  version: number;
  officialCode: string | null;
  matrix: IncidentMatrix;
  closureBusinessDays: number | null;
  correctionReason: string | null;
  resolutionSummary: string | null;
  resolvedBy: IncidentPerson | null;
  resolutionObservation: string | null;
}
export interface IncidentIntervention {
  id: number;
  description: string;
  type: IncidentOption | null;
  status: IncidentOption;
  recordedBy: IncidentPerson;
  completedBy: IncidentPerson | null;
  completedAt: string | null;
  createdAt: string;
  purpose: IncidentOption | null;
  replacementInterventionId: number | null;
}
export interface LinkedIncidentIntervention {
  linkId: number | null;
  id: number;
  code: string | null;
  description: string | null;
  statusCode: string;
  version: number;
  purpose: IncidentOption | null;
  locationCount: number;
  validatedLocationCount: number;
}
export interface IncidentInterventionLink {
  version: number;
  interventionId: number;
  interventionVersion: number;
  purposeCode: string;
  legacyWorkIds: number[];
}
export interface IncidentPhoto { id: number; contentType: string; sizeBytes: number; createdAt: string }
export interface IncidentDetail {
  incident: Incident;
  interventions: IncidentIntervention[];
  history: { id: number; status: IncidentOption; changedBy: IncidentPerson; createdAt: string }[];
  photos: IncidentPhoto[];
  suggestedType: IncidentOption | null;
  canAttend: boolean;
  updates: IncidentUpdate[];
  linkedInterventions: LinkedIncidentIntervention[];
  requiredInterventionCount: number;
  canResolve: boolean;
  canCorrectReport: boolean;
}
export interface IncidentOptions {
  statuses: IncidentOption[];
  types: IncidentOption[];
  urgencies: IncidentOption[];
  activities: IncidentOption[];
  teams: IncidentTeam[];
  matrix: IncidentMatrixOptions;
  workStatuses: IncidentOption[];
}
export interface IncidentSummary {
  pendingApproval: number;
  pendingAttention: number;
  inProgress: number;
  resolved: number;
  completedInterventions: number;
  matrix: IncidentMatrixSummary;
  pendingCorrection: number;
  resolutionObserved: number;
  validatedInterventions: number;
}
export interface InterventionCapture {
  clientReference: string;
  description: string;
  typeCode: string | null;
  completed: boolean;
  purposeCode?: string;
}
