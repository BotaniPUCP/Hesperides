import { expect, test } from 'vitest';
import { mediodiaLimaHace } from './fechas';

test('el mediodía de Lima de hace 39 días, aunque en UTC ya sea el día siguiente', () => {
  // 12 nov 2026, 23:30 en Lima = 13 nov 04:30 UTC.
  expect(mediodiaLimaHace(39, new Date('2026-11-13T04:30:00Z'))).toBe('2026-10-04T12:00:00-05:00');
});

test('hace 0 días es hoy en Lima', () => {
  expect(mediodiaLimaHace(0, new Date('2026-11-12T06:00:00Z'))).toBe('2026-11-12T12:00:00-05:00');
});

test('cruza el cambio de año', () => {
  expect(mediodiaLimaHace(3, new Date('2027-01-02T15:00:00Z'))).toBe('2026-12-30T12:00:00-05:00');
});
