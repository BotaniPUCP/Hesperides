import type { Reservation } from '@shared/types';
import { campusEventsApi } from '@/lib/campus-events-api';
import { reservationsApi } from '@/lib/reservations-api';
import { fromOccurrence, fromReservation, type CalendarEntry } from './calendarEntries';

/** El máximo de reservas por página que acepta el backend (ReservationsServiceImpl). */
export const RESERVATIONS_PER_REQUEST = 50;
/**
 * Tope de páginas por rango visible: 1000 reservas en seis semanas no ocurren en el
 * campus; si ocurriera, mejor fallar con claridad que colgar el inicio pidiendo sin fin.
 */
const MAX_PAGES = 20;

/** Todas las reservas del rango, pidiendo página tras página. */
export async function loadReservations(from: string, to: string): Promise<Reservation[]> {
  const all: Reservation[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await reservationsApi.list({ from, to }, page, RESERVATIONS_PER_REQUEST);
    all.push(...result.items);
    if (result.items.length === 0 || all.length >= result.total) return all;
  }
  throw new Error(`Más de ${MAX_PAGES * RESERVATIONS_PER_REQUEST} reservas entre ${from} y ${to}`);
}

/** Lo que muestra el calendario del inicio entre dos días, ambos incluidos. */
export async function loadCalendarEntries(from: string, to: string): Promise<CalendarEntry[]> {
  const [occurrences, reservations] = await Promise.all([
    campusEventsApi.occurrences(from, to),
    loadReservations(from, to),
  ]);
  return [...occurrences.map(fromOccurrence), ...reservations.flatMap(fromReservation)];
}
