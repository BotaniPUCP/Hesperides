'use client';

import { useCallback, useState } from 'react';
import type {
  Reservation,
  ReservationCheckQuery,
  ReservationGardenOption,
  ReservationNearbyQuery,
  ReservationOrganizationOption,
  ReservationPage,
  ReservationWarning,
} from '@shared/types';
import { reservationsApi, type ReservationFilters } from '@/lib/reservations-api';
import { useAuth } from './useAuth';
import { useRequest } from './useRequest';

/** Igual que ReservationAccess.MAINTAINERS: los otros dos roles solo leen (D-08). */
const MAINTAINERS = ['ADMIN', 'COORDINADOR'];

export function useCanMaintainReservations(): boolean {
  const { user } = useAuth();
  return user !== null && MAINTAINERS.includes(user.role.code);
}

const EMPTY_PAGE: ReservationPage = { page: 0, size: 0, total: 0, items: [] };

/** `version` se sube tras guardar para volver a pedir la agenda. */
export function useReservations(filters: ReservationFilters, page: number, version = 0) {
  const key = JSON.stringify([filters, page, version]);
  const { data, loading, errorMessage } = useRequest(key,
    () => reservationsApi.list(filters, page), { keepPreviousData: true });
  return { result: (data ?? EMPTY_PAGE) as ReservationPage, loading, errorMessage };
}

export function useReservation(code: string) {
  const [version, setVersion] = useState(0);
  const { data, loading, errorMessage, notFound, updateData } = useRequest(`${code}:${version}`,
    () => reservationsApi.detail(code));
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { reservation: data as Reservation | null, loading, errorMessage, notFound, reload, updateData };
}

export function useReservationGardens(search = '') {
  const text = search.trim();
  const { data, loading, errorMessage } = useRequest(`gardens:${text}`,
    () => reservationsApi.gardens(text || undefined));
  return { gardens: (data ?? []) as ReservationGardenOption[], loading, errorMessage };
}

export function useReservationOrganizations() {
  const { data, loading, errorMessage } = useRequest('reservation-organizations',
    () => reservationsApi.organizations());
  return { organizations: (data ?? []) as ReservationOrganizationOption[], loading, errorMessage };
}

/** Los avisos antes de guardar; con `query` null no consulta (faltan datos). */
export function useReservationCheck(query: ReservationCheckQuery | null) {
  const key = query === null ? null : JSON.stringify(query);
  const { data, loading, errorMessage } = useRequest(key, () => reservationsApi.check(query!),
    { keepPreviousData: true });
  return { warnings: (data ?? []) as ReservationWarning[], loading, errorMessage };
}

/** Los avisos del registro de intervención; con `query` null no consulta. */
export function useReservationNearby(query: ReservationNearbyQuery | null) {
  const key = query === null ? null : JSON.stringify(query);
  const { data, loading, errorMessage } = useRequest(key, () => reservationsApi.nearby(query!),
    { keepPreviousData: true });
  return { warnings: (data ?? []) as ReservationWarning[], loading, errorMessage };
}
