import type { Incident, IncidentRef, InterventionCandidate } from '@shared/types';
import { incidentsApi } from '@/lib/incidents-api';
import { definePreloadedList } from './preloadedList';

/** Una incidencia cambia por sus propias escrituras o al vincularla desde una intervención (SPEC-119 D-03). */
const INCIDENT_WRITES = [/^\/incidents(\/|$)/, /^\/interventions\/[^/]+\/incident-links/];

export const incidentsList = definePreloadedList<Incident>('incidents', () => incidentsApi.all(), INCIDENT_WRITES);

/** Las activas y abiertas que se pueden vincular desde una intervención. */
export const linkableIncidentsList = definePreloadedList<IncidentRef>(
  'linkable-incidents', () => incidentsApi.search(), INCIDENT_WRITES);

/** Las intervenciones no canceladas que se pueden vincular desde una incidencia. */
export const interventionCandidatesList = definePreloadedList<InterventionCandidate>(
  'intervention-candidates', () => incidentsApi.candidates(), [/^\/interventions(\/|$)/]);
