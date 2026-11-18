import type { Incident, IncidentDetail, IncidentMine, IncidentOptions } from '@shared/types';

const reported = { id: 1, code: 'REPORTED', label: 'Reportada' };
const medium = { id: 4, code: 'MEDIUM', label: 'Media' };

export const pendingDetail: IncidentDetail = {
  incident: {
    id: 7, code: 'INC-2026-0007', title: null,
    description: 'Rama rajada sobre el Pontódromo', originalDescription: 'Rama rajada sobre el Pontódromo',
    reportedUrgency: medium, urgency: medium, type: null, status: reported, active: false,
    zone: null, locationReference: null, latitude: null, longitude: null,
    team: { id: 3, name: 'Cuadrilla norte' }, thirdParty: false, provider: null, agreedDays: null, heightClass: null,
    requestedBy: { organizationCode: null, organizationName: null, name: 'Áreas verdes (hallazgo en campo)', contactCode: null, contactName: null },
    requestedFor: null, source: null, externalCode: null,
    reportedBy: { id: 2, fullName: 'Óscar' }, activatedBy: null, activatedAt: null, closedBy: null, closedAt: null,
    resolutionSummary: null, deadline: { dueAt: '2026-10-26T10:00:00Z', status: 'ON_TIME', met: null },
    createdAt: '2026-10-24T10:00:00Z', version: 0, editedFields: [],
    searchKey: 'inc-2026-0007 rama rajada sobre el pontodromo',
  },
  prefill: { status: 'PENDING', suggestion: null, suggestedUrgencyCode: null, suggestsThirdParty: false, warnings: [], updatedAt: null },
  linkedInterventions: [], closureBlockers: ['NOT_ACTIVE', 'NO_LINKED_WORK'], activationGaps: ['TYPE', 'LOCATION'],
  similarCases: [], history: [], photos: [], updates: [],
  capabilities: { canEdit: true, canActivate: true, canLink: false, canClose: false, canRetryPrefill: false, canComment: true, canAddPhoto: true },
};

export const incidentOptions: IncidentOptions = {
  urgencies: [{ id: 3, code: 'LOW', label: 'Baja' }, medium, { id: 5, code: 'HIGH', label: 'Alta' }],
  classes: [{ id: 10, code: 'TREES', label: 'Arbolado' }],
  types: [{ id: 11, code: 'BRANCH_AT_RISK', label: 'Rama en riesgo de caída', classCode: 'TREES' }],
  statuses: [reported, { id: 2, code: 'IN_PROGRESS', label: 'En proceso' }, { id: 6, code: 'CLOSED', label: 'Cerrada' }],
  sources: [{ id: 20, code: 'SUPERVISION', label: 'Supervisión' }],
  heightClasses: ['UNDER_5M', 'OVER_5M', 'UNCLASSIFIED', 'NOT_APPLICABLE'],
  teams: [{ id: 3, name: 'Cuadrilla norte' }],
  sections: [{ id: 40, code: 'AV-0001', name: 'Pontódromo' }],
  defaultRequesterName: 'Áreas verdes (hallazgo en campo)',
};

/** Lo que trae `/incidents/all`: todas las que ve quien pregunta (SPEC-119). */
export const incidentList: Incident[] = [pendingDetail.incident];

export const approvedDetail: IncidentDetail = {
  ...pendingDetail,
  incident: {
    ...pendingDetail.incident, version: 2, active: true, activatedAt: '2026-10-24T11:00:00Z',
    activatedBy: { id: 1, fullName: 'Coordinación' }, title: 'Rama en riesgo',
    type: { id: 11, code: 'BRANCH_AT_RISK', label: 'Rama en riesgo de caída' },
    zone: { id: 40, code: 'AV-0001', name: 'Pontódromo' }, editedFields: ['typeCode'],
  },
  prefill: {
    status: 'READY', suggestedUrgencyCode: 'HIGH', suggestsThirdParty: true, warnings: ['VERIFY_HEIGHT'], updatedAt: '2026-10-24T10:01:00Z',
    suggestion: { title: 'Rama en riesgo', typeCode: 'PEST', imminentRisk: true, imminentReason: 'Pasa mucha gente', plan: '1. Acordonar', confidence: 0.8 },
  },
  closureBlockers: ['NO_LINKED_WORK'], activationGaps: [],
  capabilities: { ...pendingDetail.capabilities, canActivate: false, canLink: true },
};

export const incidentMine: IncidentMine = { total: 1, notActive: 1, open: 0, closed: 0, recent: [pendingDetail.incident] };
