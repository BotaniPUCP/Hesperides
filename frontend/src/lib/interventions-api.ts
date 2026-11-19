import { apiClient, ApiError } from './api';
import { mensajeDeApiError, traducirConocido } from './api-errors';
import { INTERVENTION_MESSAGES, INTERVENTION_PATTERNS } from './interventionErrorMessages';
import type { Page } from '@shared/types';
import type { GeoJsonGeometry } from '@shared/types';

export interface InterventionSummary {
  activityWorkflow?: boolean; progressPercentage?: number | null; legacyBaselinePending?:boolean;
  id: number; code: string; activityTitle?: string; version: number; classItemId: number; typeItemId: number | null;
  scheduledDate: string; planningStatusCode: string; statusCode: string;
  /** SPEC-115: el trabajo usa maquinaria de corte. */
  usesCuttingMachinery?: boolean;
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
  sourceIncidents?: InterventionSourceIncident[];
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
/** Incidencia vinculada, vista desde la intervención (SPEC-201 §3.8). */
export interface InterventionSourceIncident {
  id: number; code: string; title: string | null; statusCode: string; active: boolean; linkId: number | null;
}
export interface InterventionPlanning {
  campusSelectionRevision?:string|null;
  classItemId: number; typeItemId: number | null; scheduledDate: string; description: string | null;
  locations: InterventionLocation[]; version?: number; rescheduleReason?: string;
  originItemId?: number; reportedByItemId?: number; externalCode?: string | null; requestedAt?: string | null;
  usesCuttingMachinery?: boolean;
  /** SPEC-201 §3.8: incidencias que atiende, solo al crear. */
  incidentIds?: number[];
}
export interface InterventionOptions {
  places: {id:number; code?:string; name:string}[];
  zones: {id:number; name:string}[];
  teams: { id: number; name: string; responsibleSupervisorUserId: number | null; assignees: { id: number; fullName: string }[] }[];
  catalogs: { id: number; code: string; label: string; typeCode: string; parentItemId: number | null;
    /** SPEC-115: el tipo marca sola la casilla de maquinaria de corte. */
    suggestsCuttingMachinery?: boolean }[];
}
export type InterventionPage = Page<InterventionSummary>;
export interface ActivityOptions {
  catalogs: InterventionOptions['catalogs'];
  supervisors: {id:number; name:string}[];
  statuses: {id:number; code:string; label:string}[];
}
export interface ActivityPlanning { planning: InterventionPlanning; responsibleSupervisorUserId:number|null; }
export type ActivityTargetStatus='NOT_STARTED'|'PARTIAL'|'COMPLETED';
export interface ActivityProgress {
  version:number;clientReference:string;percentage:number;description:string;
  targets:{locationId:number;statusCode:ActivityTargetStatus;partialDescription:string|null}[];evidenceIds:number[];
}
export interface ActivityEvidence {
  historical?:boolean;
  id:number;clientReference:string;progressEntryId:number|null;locationId:number|null;caption:string|null;
  uploadedByUserId:number;uploadedAt:string|null;fileUrl:string|null;
}
export interface ActivityDetail {
  legacyBaselinePending?:boolean;previousHistory?:InterventionHistoryEvent[];
  previousReports?:{locationId:number;description:string;actorName:string|null;occurredAt:string|null}[];
  id:number;code:string;activityTitle:string;version:number;classItemId:number;typeItemId:number|null;
  scheduledDate:string;description:string|null;statusCode:string;percentage:number|null;
  responsibleSupervisorUserId:number|null;campusSelectionRevision:string;plannedSurfaceM2:number|null;
  startedAt:string|null;executedAt:string|null;finishedAt:string|null;cancelledAt:string|null;
  cancellationReason:string|null;allowedActions:string[];executionBlockedUntil:string|null;
  elapsedSeconds?:number|null;evidences:ActivityEvidence[];
  sourceIncidents:InterventionSourceIncident[];
  targets:(Pick<InterventionLocation,'clientReference'|'zoneId'|'placeId'|'location'|'description'|'locationDescription'|'zoneBoundary'|'elementIds'|'linkedElementCodes'>&{id:number;statusCode:ActivityTargetStatus;partialDescription:string|null})[];
  history:{id:number;actorUserId:number;actorName:string;percentage:number;description:string;occurredAt:string;targets:{locationId:number;statusCode:string;partialDescription:string|null}[]}[];
}
/** The shared list keeps legacy records and server-side filters; commands use the global contract. */
export const activitiesApi = {
  options:()=>apiClient.get<ActivityOptions>('/activities/options'),
  detail:(id:number)=>apiClient.get<ActivityDetail>(`/activities/${id}`),
  mapOptions:(id:number)=>apiClient.get<CampusOptions>(`/activities/${id}/map-options`),
  create:(body:ActivityPlanning,key:string)=>apiClient.postWithKey<ActivityDetail>('/activities',body,key),
  update:(id:number,body:ActivityPlanning)=>apiClient.put<ActivityDetail>(`/activities/${id}/planning`,body),
  progress:(id:number,body:ActivityProgress)=>apiClient.post<ActivityDetail>(`/activities/${id}/progress`,body),
  responsible:(id:number,version:number,responsibleSupervisorUserId:number|null)=>apiClient.put<ActivityDetail>(`/activities/${id}/responsible`,{version,responsibleSupervisorUserId}),
  approve:(id:number,version:number)=>apiClient.post<ActivityDetail>(`/activities/${id}/approve`,{version}),
  cancel:(id:number,version:number,reason:string)=>apiClient.post<ActivityDetail>(`/activities/${id}/cancel`,{version,reason:reason.trim()||null}),
  announce:(id:number,body:{version:number;clientReference:string;locationId:number|null;caption:string;momentCode:string})=>apiClient.post<ActivityEvidence>(`/activities/${id}/evidences`,body),
  upload:(id:number,evidenceId:number,file:File)=>{const form=new FormData();form.append('file',file);return apiClient.putForm<ActivityEvidence>(`/activities/${id}/evidences/${evidenceId}/file`,form);},
  photo:(id:number,evidenceId:number)=>apiClient.getBlob(`/activities/${id}/evidences/${evidenceId}/file`),
};
const base = '/interventions';
export const interventionsApi = {
  campusOptions:()=>apiClient.get<CampusOptions>(`${base}/campus-selection`),
  campusPreview:(selectionRevision:string,zoneIds:number[],specimenIds:number[])=>apiClient.post<{surfaceM2:number;areaCount:number;specimenCount:number}>(`${base}/campus-selection/preview`,{selectionRevision,zoneIds,specimenIds}),
  list: (page: number, status: string, dateFrom: string, dateTo: string, greenElementCode?: string, active?: boolean,
    greenElementId?: number | string) => {
    const query = new URLSearchParams({ page: String(page), size: '20' });
    if (active !== undefined) query.set('active', String(active));
    if (status) query.set(['PLANNED','IN_PROGRESS','EXECUTED','FINISHED','CANCELLED'].includes(status)?'activityStatusCode':'statusCode', status);
    if (dateFrom) query.set('dateFrom', dateFrom);
    if (dateTo) query.set('dateTo', dateTo);
    if (greenElementCode !== undefined) query.set('greenElementCode', greenElementCode);
    if (greenElementId !== undefined) query.set('greenElementId', String(greenElementId));
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
    if (error.status === 404 && /Endpoint not found|No handler found|No static resource|No mapping for/i.test(error.message)) return 'El servidor no tiene disponible esta función. Comprueba que el backend esté actualizado.';
    if (error.status === 404) return 'La actividad o el objetivo solicitado no está disponible.';
    const known = INTERVENTION_MESSAGES[error.message] ?? traducirConocido(error.message, INTERVENTION_PATTERNS);
    if (known) return known;
    // Un 409 que aún no tiene su propio mensaje: el aviso general sigue siendo lo más útil.
    if (error.status === 409) return 'El trabajo cambió o hay un envío en curso. Actualiza la información antes de reintentar; conserva tu texto.';
  }
  return mensajeDeApiError(error);
}
