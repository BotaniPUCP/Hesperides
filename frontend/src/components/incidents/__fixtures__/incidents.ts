import type { IncidentDetail, IncidentOptions, Page, Incident, IncidentMatrix } from '@shared/types';

export const emptyMatrix: IncidentMatrix = {
  event: { id: 20, code: 'INCIDENT', label: 'Incidencia' },
  serviceGroup: { id: 21, code: 'GREEN_AREAS', label: 'Servicios de Áreas verdes' },
  service: null, company: null, process: null, subprocess: null, severity: null, impacts: [],
  responsible: null, immediateAction: null, rootCauseItem: null, rootCause: null,
  preventiveAction: null, impactedProcess: null, observations: null,
  intakeChannel: {id:80,code:'FORM',label:'Formulario'},reporterName:null,zone:null,
};

export const pendingDetail: IncidentDetail = {
  incident: {
    id: 7, description: 'Rama caída en puerta principal', originalDescription: 'Rama caída en puerta principal',
    locationReference: null, latitude: null, longitude: null, type: null, urgency: null,
    status: { id: 1, code: 'PENDING_APPROVAL', label: 'Pendiente de aprobación' },
    reportedBy: { id: 2, fullName: 'Óscar' }, team: { id: 3, name: 'Cuadrilla norte' },
    approvedBy: null, approvedAt: null, resolvedAt: null, channel: 'WEB', createdAt: '2026-10-24T10:00:00Z', version: 0,
    officialCode: null, closureBusinessDays: null, matrix: emptyMatrix,
    correctionReason: null, resolutionSummary: null, resolvedBy: null, resolutionObservation: null,
  },
  photos: [], history: [], suggestedType: null, canAttend: true, updates: [],
  linkedInterventions: [], requiredInterventionCount: 0, canResolve: false, canCorrectReport: false,
  canEdit:true,canLinkInterventions:true,canCreateIntervention:true,
};

export const incidentOptions: IncidentOptions = {
  canCreateIntervention:true,
  workStatuses: [{ id: 60, code: 'PLANNED', label: 'Planificada' }, { id: 61, code: 'COMPLETED', label: 'Finalizada, pendiente de validación' },
    { id: 62, code: 'VALIDATED', label: 'Validada' }],
  statuses: [pendingDetail.incident.status, { id: 2, code: 'OPEN', label: 'Pendiente de atención' }],
  types: [{ id: 3, code: 'FALLEN_BRANCH', label: 'Rama caída' }],
  urgencies: [{ id: 4, code: 'HIGH', label: 'Alta' }],
  activities: [{ id: 5, code: 'PODA', label: 'Poda' }], teams: [pendingDetail.incident.team!],
  matrix: {
    events:[{id:20,code:'INCIDENT',label:'Incidencia',parentCode:null,description:null}],
    intakeChannels:[{id:80,code:'FORM',label:'Formulario',parentCode:null,description:null}],zones:[],
    services: [{ id: 30, code: 'AV-01', label: 'AV-01- Mantenimiento de áreas verdes', parentCode: null, description: null }],
    companies: [], processes: [], subprocesses: [], rootCauses: [], responsiblePeople: [],
    severities: [{ id: 31, code: 'HIGH', label: 'Alta', parentCode: null, description: null }],
    impacts: [{ id: 32, code: 'SAFETY', label: 'Seguridad', parentCode: null, description: null },
      { id: 33, code: 'ENVIRONMENT', label: 'Ambiental', parentCode: null, description: null }],
    actionPurposes: [{ id: 34, code: 'MITIGATION', label: 'Mitigación / corrección inmediata', parentCode: null, description: null },
      { id: 35, code: 'PREVENTION', label: 'Prevención / mejora', parentCode: null, description: null }],
  },
};

export const incidentPage: Page<Incident> = {
  content: [pendingDetail.incident], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
};

export const approvedDetail: IncidentDetail = {
  ...pendingDetail,
  incident: {
    ...pendingDetail.incident, version: 2, approvedAt: '2026-10-24T11:00:00Z',
    approvedBy: { id: 1, fullName: 'Coordinación' }, status: incidentOptions.statuses[1],
  },
};
