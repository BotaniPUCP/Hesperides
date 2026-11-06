export interface IncidentOption { id: number; code: string; label: string }
export interface IncidentPerson { id: number; fullName: string }
export interface IncidentTeam { id: number; name: string }

export interface IncidentCapture {
  description: string;
  locationReference: string | null;
  latitude: number | null;
  longitude: number | null;
  matrix?: IncidentMatrixReview;
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
  eventCode?: string | null;
  intakeChannelCode?: string | null;
  reporterName?: string | null;
  zoneId?: number | null;
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
  intakeChannel: IncidentOption | null;
  reporterName: string | null;
  zone: IncidentZone | null;
}
export interface IncidentZone { id: number; code: string; label: string; sectorLabel: string | null }
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
  events: IncidentMatrixOption[];
  intakeChannels: IncidentMatrixOption[];
  zones: IncidentZone[];
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
  states: IncidentDistribution[];
  urgencies: IncidentDistribution[];
  rootCauses: IncidentDistribution[];
  companies: IncidentDistribution[];
  sectors: IncidentDistribution[];
  locations: IncidentDistribution[];
  events: IncidentDistribution[];
  channels: IncidentDistribution[];
}
export interface IncidentUpdate {
  id: number;
  author: IncidentPerson;
  kind: IncidentOption;
  body: string;
  createdAt: string;
}
export interface IncidentMatrixExport { filename: string; contentType: string; content: string }
export interface Incident extends Omit<IncidentCapture,'matrix'> {
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
}
export interface IncidentPhoto { id: number; contentType: string; sizeBytes: number; createdAt: string }
export interface IncidentDetail {
  incident: Incident;
  history: { id: number; status: IncidentOption; changedBy: IncidentPerson; createdAt: string }[];
  photos: IncidentPhoto[];
  suggestedType: IncidentOption | null;
  canAttend: boolean;
  updates: IncidentUpdate[];
  linkedInterventions: LinkedIncidentIntervention[];
  requiredInterventionCount: number;
  canResolve: boolean;
  canCorrectReport: boolean;
  canEdit: boolean;
  canLinkInterventions: boolean;
  canCreateIntervention: boolean;
}
export interface IncidentOptions {
  canCreateIntervention: boolean;
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
  dashboard: IncidentDashboardSummary;
}
export interface IncidentDashboardSummary {
  total: number; active: number; highUrgency: number; pendingRegistration: number;
  withoutWork: number; readyForClosure: number; generatedAt: string; attention: Incident[];
}
export interface MyIncidentReports {
  total: number; pendingRegistration: number; active: number; resolved: number; recent: Incident[];
}
