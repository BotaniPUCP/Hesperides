import { formatAreaOf, formatPercent, formatPeriod } from '../reportFormat';

const plain = (text: string | null) => text?.replace(/ /g, ' ');

describe('formato de cifras de reportes (SPEC-202 §7.5)', () => {
  it('usa coma decimal y un decimal en los porcentajes', () => {
    expect(plain(formatPercent(25))).toBe('25,0 %');
    expect(plain(formatPercent(62.9))).toBe('62,9 %');
    expect(formatPercent(null)).toBeNull();
  });

  it('muestra superficies enteras sin separador de miles en cuatro cifras', () => {
    expect(plain(formatAreaOf(1000, 4000))).toBe('1000 de 4000 m²');
  });

  it('escribe el periodo en texto, con los dos meses cuando cruza de uno a otro', () => {
    expect(formatPeriod('2026-10-01', '2026-10-31')).toBe('Del 1 al 31 de octubre de 2026');
    expect(formatPeriod('2026-10-26', '2026-11-01')).toBe('Del 26 de octubre al 1 de noviembre de 2026');
    expect(formatPeriod('2025-12-15', '2026-01-14')).toBe('Del 15 de diciembre de 2025 al 14 de enero de 2026');
  });
});
