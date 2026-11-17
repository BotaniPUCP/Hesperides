import { duskOf } from '../sunset';
import { clockOf, SUNSET_HOUR, SUNSET_HOURS } from '../sunsetHours';

describe('hora del Atardecer', () => {
  it('se lee como reloj', () => {
    expect(clockOf(17.72)).toBe('17:43');
    expect(clockOf(16.5)).toBe('16:30');
    expect(clockOf(18)).toBe('18:00');
  });

  it('la hora de arranque cae dentro del deslizador', () => {
    expect(SUNSET_HOUR).toBeGreaterThan(SUNSET_HOURS[0]);
    expect(SUNSET_HOUR).toBeLessThan(SUNSET_HOURS[1]);
  });

  it('el crepúsculo empieza después de la hora dorada y llega a casi todo al final del deslizador', () => {
    expect(duskOf(SUNSET_HOURS[0])).toBe(0);
    expect(duskOf(SUNSET_HOUR)).toBeLessThan(0.05);
    expect(duskOf(SUNSET_HOURS[1])).toBeGreaterThan(0.95);
    expect(duskOf(18.2)).toBeGreaterThan(duskOf(18));
  });
});
