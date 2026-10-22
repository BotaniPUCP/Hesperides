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
}
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
}
export interface IncidentPhoto { id: number; contentType: string; sizeBytes: number; createdAt: string }
export interface IncidentDetail {
  incident: Incident;
  interventions: IncidentIntervention[];
  history: { id: number; status: IncidentOption; changedBy: IncidentPerson; createdAt: string }[];
  photos: IncidentPhoto[];
  suggestedType: IncidentOption | null;
  canAttend: boolean;
}
export interface IncidentOptions {
  statuses: IncidentOption[];
  types: IncidentOption[];
  urgencies: IncidentOption[];
  activities: IncidentOption[];
  teams: IncidentTeam[];
}
export interface IncidentSummary {
  pendingApproval: number;
  pendingAttention: number;
  inProgress: number;
  resolved: number;
  completedInterventions: number;
}
export interface InterventionCapture {
  clientReference: string;
  description: string;
  typeCode: string | null;
  completed: boolean;
}
