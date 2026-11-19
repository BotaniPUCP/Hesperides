/** SPEC-114 §3: el calendario del campus. Espejo de CampusEventDtos del backend. */

export type CampusEventType = 'BLOCKING' | 'HOLIDAY';
export type CampusEventScope = 'CAMPUS' | 'SECTOR' | 'SECTION';

/** `weekdays`: ISO, 1 = lunes; vacío = todos los días. Horas «14:00» o null; `version` solo al editar. */
export interface CampusEventRequest {
  name: string;
  description: string | null;
  typeCode: CampusEventType;
  scope: CampusEventScope;
  zoneId: number | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  weekdays: number[];
  version?: number;
}

export interface CampusEvent extends Omit<CampusEventRequest, 'version'> {
  id: number;
  typeLabel: string;
  zoneName: string | null;
  version: number;
}

/** Un día en que ocurre un evento; `zoneActive` es falso si su zona se dio de baja. */
export interface CampusEventOccurrence {
  eventId: number;
  name: string;
  typeCode: CampusEventType;
  typeLabel: string;
  scope: CampusEventScope;
  zoneId: number | null;
  zoneName: string | null;
  zoneActive: boolean;
  date: string;
  startTime: string | null;
  endTime: string | null;
}

/** Misma forma que los avisos de reservas (SPEC-107): se muestran juntos. */
export interface CampusEventWarning {
  kind: 'CAMPUS_EVENT' | 'HOLIDAY';
  severity: 'WARNING';
  text: string;
  eventId: number;
}

export interface CampusEventCheckQuery {
  dates: string[];
  zoneIds?: number[];
  placeIds?: number[];
  startTime?: string;
  endTime?: string;
}
