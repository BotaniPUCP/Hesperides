import type { IncidentDetail, IncidentOptions, Page, Incident } from '@shared/types';

export const pendingDetail: IncidentDetail = {
  incident: {
    id: 7, description: 'Rama caída en puerta principal', originalDescription: 'Rama caída en puerta principal',
    locationReference: null, latitude: null, longitude: null, type: null, urgency: null,
    status: { id: 1, code: 'PENDING_APPROVAL', label: 'Pendiente de aprobación' },
    reportedBy: { id: 2, fullName: 'Óscar' }, team: { id: 3, name: 'Cuadrilla norte' },
    approvedBy: null, approvedAt: null, resolvedAt: null, channel: 'WEB', createdAt: '2026-10-24T10:00:00Z', version: 0,
  },
  interventions: [], photos: [], history: [], suggestedType: null, canAttend: true,
};

export const incidentOptions: IncidentOptions = {
  statuses: [pendingDetail.incident.status, { id: 2, code: 'OPEN', label: 'Pendiente de atención' }],
  types: [{ id: 3, code: 'FALLEN_BRANCH', label: 'Rama caída' }],
  urgencies: [{ id: 4, code: 'HIGH', label: 'Alta' }],
  activities: [{ id: 5, code: 'PODA', label: 'Poda' }], teams: [pendingDetail.incident.team!],
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
