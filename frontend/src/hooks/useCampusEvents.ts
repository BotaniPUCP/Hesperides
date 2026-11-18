'use client';

import type {
  CampusEvent, CampusEventCheckQuery, CampusEventOccurrence, CampusEventType, ReservationWarning,
} from '@shared/types';
import { campusEventsApi } from '@/lib/campus-events-api';
import { useAuth } from './useAuth';
import { useRequest } from './useRequest';

/** Igual que CampusEventsController.MAINTAINERS (SPEC-114 D-04). */
const MAINTAINERS = ['ADMIN', 'COORDINADOR'];

export function useCanMaintainCampusEvents(): boolean {
  const { user } = useAuth();
  return user !== null && MAINTAINERS.includes(user.role.code);
}

/** `version` se sube tras guardar o dar de baja para volver a pedir la agenda. */
export function useCampusEventOccurrences(from: string, to: string, type: CampusEventType | null, version = 0) {
  const key = JSON.stringify([from, to, type, version]);
  const { data, loading, errorMessage } = useRequest(key,
    () => campusEventsApi.occurrences(from, to, type ?? undefined), { keepPreviousData: true });
  return { occurrences: (data ?? []) as CampusEventOccurrence[], loading, errorMessage };
}

export function useCampusEvent(id: number | null) {
  const { data, loading, errorMessage, notFound } = useRequest(id === null ? null : `campus-event:${id}`,
    () => campusEventsApi.get(id!));
  return { event: data as CampusEvent | null, loading, errorMessage, notFound };
}

/**
 * Los avisos del calendario para un trabajo o una reserva; con `query` null no consulta.
 * Se devuelven con la forma de los avisos de reservas para mostrarlos con el mismo componente.
 */
export function useCampusEventCheck(query: CampusEventCheckQuery | null) {
  const key = query === null ? null : `campus-check:${JSON.stringify(query)}`;
  const { data } = useRequest(key, () => campusEventsApi.check(query!), { keepPreviousData: true });
  const warnings: ReservationWarning[] = (data ?? []).map((w) => ({
    kind: w.kind, severity: 'WARNING', text: w.text, reservationCode: null, interventionId: null,
  }));
  return { warnings };
}
