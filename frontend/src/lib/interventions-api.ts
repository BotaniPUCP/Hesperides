import { apiClient, ApiError } from './api';
import { mensajeDeApiError, traducirConocido } from './api-errors';
import { INTERVENTION_MESSAGES, INTERVENTION_PATTERNS } from './interventionErrorMessages';
import type { Page } from '@shared/types';
import type { GeoJsonGeometry } from '@shared/types';

export interface InterventionSummary {
  id: number; code: string; activityTitle?: string; version: number; classItemId: number; typeItemId: number | null;
  scheduledDate: string; planningStatusCode: string; statusCode: string;
  teamId: number | null; assignedToUserId: number | null; startedAt: string | null;
  completedAt: string | null; validatedAt: string | null;
  elapsedSeconds?: number | null;
  locationCount: number; completedLocationCount: number; validatedLocationCount: number;
  pendingEvidenceCount: number; approvedForCounting: boolean;
}
export interface InterventionLocation {
  id?: number; clientReference: string; zoneId: number | null; placeId: number | null;
  location: { latitude: number; longitude: number } | null; description: string | null;
  locationDescription?: string; elementIds: number[]; unitItemId: number | null;
  requestedQuantity: number | null; progressQuantity?: number | null; executedQuantity?: number | null;
  elementCodes?: string[]; linkedElementCodes?: string[];
  statusCode?: string; executionNotes?: string | null; rejectionReason?: string | null;
  attemptNumber?: number; executedByUserId?: number | null; allowedActions?: string[];
  zoneSelectionRevision?: string | null; zoneBoundary?: GeoJsonGeometry;
}
export interface InterventionEvidence {
  id: number; interventionLocationId: number; attemptNumber: number;
  caption: string | null; uploadedAt: string | null; canUpload: boolean;
  uploadedByUserId: number; momentCode: string;
}
export interface InterventionHistoryEvent {
  id?: number; actionCode: string; interventionLocationId: number | null;
  actorUserId: number; actorName?: string | null; occurredAt: string; reason: string | null;
  attemptNumber?: number | null;
  progress?: {
    quantity: number | null; notes: string | null; unitItemId: number | null;
    previousQuantity?: number | null; previousNotes?: string | null;
  };
}
export interface InterventionDetail extends InterventionSummary {
  campusSelectionRevision?:string|null;
  incidentIntegrationAvailable?: boolean;
  sourceIncidents?: { id: number; code: string | null; statusCode: string }[];
  description: string | null; locations: InterventionLocation[]; evidences: InterventionEvidence[];
  originItemId: number; reportedByItemId: number; externalCode: string | null; requestedAt: string | null;
  responsibleSupervisorUserId: number | null;
  executionBlockedUntil?: string | null;
  history: InterventionHistoryEvent[];
  quantityTotals: { unitItemId: number; requestedQuantity: number | null; progressQuantity: number | null; executedQuantity: number | null }[];
  plannedSurfaceM2?: number | null;
}
export interface InterventionZone {
  id:number; code:string; name:string; geometryValid:boolean; geometry:GeoJsonGeometry;
  areaM2:number; point:{latitude:number;longitude:number}; polygonCount:number;
}
export interface CampusSpecimen {
  id:number;code:string;name:string;point:{latitude:number;longitude:number};typeCode:string;
  scientificName:string;heightM:number|null;crownRadiusM:number|null;quantity:number;
}
export interface CampusOptions {selectionRevision:string;zones:InterventionZone[];specimens:CampusSpecimen[];}
export interface InterventionZoneOptions {
  place:{id:number;code:string;name:string;geometryValid:boolean;geometry:GeoJsonGeometry|null};
  datasetRevision:string; reviewVersion:number; reviewed:boolean; current:boolean;
  selectionRevision:string|null; zones:InterventionZone[]; candidates:InterventionZone[];
  reviewedAt:string|null; reviewedByUserId:number|null;
}
export interface ZoneSelection {placeId:number;zoneId:number;zoneSelectionRevision:string;}
export interface ZonePreview {surfaceM2:number;zones:InterventionZone[];}
export interface InterventionPlanning {
  campusSelectionRevision?:string|null;
  classItemId: number; typeItemId: number | null; scheduledDate: string; description: string | null;
  locations: InterventionLocation[]; version?: number; rescheduleReason?: string;
  originItemId?: number; reportedByItemId?: number; externalCode?: string | null; requestedAt?: string | null;
}
export interface InterventionOptions {
  places: {id:number; code?:string; name:string}[];
  zones: {id:number; name:string}[];
  teams: { id: number; name: string; responsibleSupervisorUserId: number | null; assignees: { id: number; fullName: string }[] }[];
  catalogs: { id: number; code: string; label: string; typeCode: string; parentItemId: number | null }[];
}
export type InterventionPage = Page<InterventionSummary>;
const base = '/interventions';
export const interventionsApi = {
  campusOptions:()=>apiClient.get<CampusOptions>(`${base}/campus-selection`),
  campusPreview:(selectionRevision:string,zoneIds:number[],specimenIds:number[])=>apiClient.post<{surfaceM2:number;areaCount:number;specimenCount:number}>(`${base}/campus-selection/preview`,{selectionRevision,zoneIds,specimenIds}),
  list: (page: number, status: string, dateFrom: string, dateTo: string, greenElementCode?: string, active?: boolean) => {
    const query = new URLSearchParams({ page: String(page), size: '20' });
    if (active !== undefined) query.set('active', String(active));
    if (status) query.set('statusCode', status);
    if (dateFrom) query.set('dateFrom', dateFrom);
    if (dateTo) query.set('dateTo', dateTo);
    if (greenElementCode !== undefined) query.set('greenElementCode', greenElementCode);
    return apiClient.get<InterventionPage>(`${base}?${query}`);
  },
  detail: (id: number) => apiClient.get<InterventionDetail>(`${base}/${id}`),
  options: () => apiClient.get<InterventionOptions>(`${base}/options`),
  zoneOptions: (placeId:number) => apiClient.get<InterventionZoneOptions>(`${base}/places/${placeId}/zones`),
  previewZones: (selections:ZoneSelection[]) => apiClient.post<ZonePreview>(`${base}/zone-selection/preview`,{selections}),
  reviewZones: (placeId:number,body:{datasetRevision:string;version:number;zoneIds:number[];multipartAcknowledged:number[];reason:string}) =>
    apiClient.put<InterventionZoneOptions>(`${base}/places/${placeId}/zones`,body),
  create: (body: InterventionPlanning, key: string) => apiClient.postWithKey<InterventionDetail>(base, body, key),
  update: (id: number, body: InterventionPlanning) => apiClient.put<InterventionDetail>(`${base}/${id}`, body),
  assign: (id: number, version: number, teamId: number, assignedToUserId: number) =>
    apiClient.post<InterventionDetail>(`${base}/${id}/assign`, { version, teamId, assignedToUserId }),
  cancel: (id: number, version: number, reason: string) => apiClient.post<InterventionDetail>(`${base}/${id}/cancel`, { version, reason }),
  command: (id: number, locationId: number, action: string, body: Record<string, unknown>) => action === 'execution'
    ? apiClient.put<InterventionDetail>(`${base}/${id}/locations/${locationId}/execution`, body)
    : apiClient.post<InterventionDetail>(`${base}/${id}/locations/${locationId}/${action}`, body),
  announce: (id: number, locationId: number, version: number, clientReference: string, key: string, caption: string, momentCode: string) =>
    apiClient.postWithKey<{ id: number }>(`${base}/${id}/evidences`, { version, interventionLocationId: locationId, clientReference, caption, momentCode }, key),
  upload: (id: number, evidenceId: number, file: File) => {
    const form = new FormData(); form.append('file', file);
    return apiClient.putForm(`${base}/${id}/evidences/${evidenceId}/file`, form);
  },
  photo: (id: number, evidenceId: number) => apiClient.getBlob(`${base}/${id}/evidences/${evidenceId}/file`),
};

export function interventionError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 && /campus/i.test(error.message)) return 'El inventario cambió. Actualiza el mapa y revisa la selección antes de guardar.';
    if (error.status === 409 && /zone|spatial/i.test(error.message)) return 'Las zonas o sus asociaciones cambiaron. Actualiza las zonas y confirma la selección antes de guardar.';
    if (error.status === 404) return 'La intervención o ubicación no está disponible para tu cuenta.';
    const known = INTERVENTION_MESSAGES[error.message] ?? traducirConocido(error.message, INTERVENTION_PATTERNS);
    if (known) return known;
    // Un 409 que aún no tiene su propio mensaje: el aviso general sigue siendo lo más útil.
    if (error.status === 409) return 'El trabajo cambió o hay un envío en curso. Actualiza la información antes de reintentar; conserva tu texto.';
  }
  return mensajeDeApiError(error);
}
