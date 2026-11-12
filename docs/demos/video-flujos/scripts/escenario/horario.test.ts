import { expect, test } from 'vitest';
import { cabenReservasDeHoy, horaLimaHoy } from './fechas';

test('a las 10:00 de Lima caben las reservas de hoy', () => {
  expect(cabenReservasDeHoy(new Date('2026-11-12T15:00:00Z'))).toBe(true);
});

test('a las 22:00 de Lima ya no caben: la reserva en curso pasaría la medianoche', () => {
  expect(cabenReservasDeHoy(new Date('2026-11-13T03:00:00Z'))).toBe(false);
});

test('a las 03:59 de Lima todavía no caben: la terminada empezaría ayer', () => {
  expect(cabenReservasDeHoy(new Date('2026-11-12T08:59:00Z'))).toBe(false);
});

test('los bordes: 04:00 sí y 21:59 sí', () => {
  expect(cabenReservasDeHoy(new Date('2026-11-12T09:00:00Z'))).toBe(true);
  expect(cabenReservasDeHoy(new Date('2026-11-13T02:59:00Z'))).toBe(true);
});

test('una hora en punto de hoy en Lima, desplazada desde la hora actual', () => {
  // 18:25 en Lima: la hora en curso es 18:00.
  const ahora = new Date('2026-11-12T23:25:00Z');
  expect(horaLimaHoy(-1, ahora)).toBe('2026-11-12T17:00:00-05:00');
  expect(horaLimaHoy(2, ahora)).toBe('2026-11-12T20:00:00-05:00');
});
