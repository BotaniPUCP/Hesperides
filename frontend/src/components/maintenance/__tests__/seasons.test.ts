import { SEASONS, monthName, newRow, parseSeasonRows, toRow, type SeasonRow } from '../seasons';
import type { SeasonalInterval } from '@shared/types';

function row(over: Partial<SeasonRow> = {}): SeasonRow {
  return { id: '1', season: 'VERANO', minDays: '30', maxDays: '35', targetDays: '21', ...over };
}

describe('parseSeasonRows', () => {
  it('convierte las filas en intervalos con los meses de cada estación', () => {
    // Los meses viajan como dato para que el motor no tenga que derivarlos del
    // nombre de la estación.
    const { seasons, error } = parseSeasonRows([row()]);

    expect(error).toBeUndefined();
    expect(seasons).toEqual<SeasonalInterval[]>([
      {
        season: 'VERANO',
        startMonth: 1,
        endMonth: 3,
        minDaysInterval: 30,
        maxDaysInterval: 35,
        targetDaysInterval: 21,
      },
    ]);
  });

  it('conserva el rango propio de cada estación en vez de aplastarlos', () => {
    // Esto es lo que el diseño anterior perdía: guardaba min=30 y max=45 y el
    // detalle por estación solo sobrevivía como texto decorativo.
    const { seasons } = parseSeasonRows([
      row({ id: '1', season: 'VERANO', minDays: '30', maxDays: '35' }),
      row({ id: '2', season: 'INVIERNO', minDays: '40', maxDays: '45' }),
    ]);

    expect(seasons).toHaveLength(2);
    expect(seasons?.[0]).toMatchObject({ season: 'VERANO', minDaysInterval: 30, maxDaysInterval: 35 });
    expect(seasons?.[1]).toMatchObject({ season: 'INVIERNO', minDaysInterval: 40, maxDaysInterval: 45 });
  });

  it('el intervalo teórico es opcional', () => {
    const { seasons, error } = parseSeasonRows([row({ targetDays: '' })]);

    expect(error).toBeUndefined();
    expect(seasons?.[0].targetDaysInterval).toBeNull();
  });

  it('rechaza una lista vacía', () => {
    expect(parseSeasonRows([]).error).toMatch(/al menos una estación/i);
  });

  it('rechaza la misma estación dos veces', () => {
    const { error } = parseSeasonRows([
      row({ id: '1', season: 'VERANO' }),
      row({ id: '2', season: 'VERANO', minDays: '25', maxDays: '28' }),
    ]);

    expect(error).toMatch(/más de una vez/i);
  });

  it('rechaza un rango invertido nombrando la estación', () => {
    const { error } = parseSeasonRows([row({ season: 'INVIERNO', minDays: '45', maxDays: '30' })]);

    expect(error).toContain('Invierno');
    expect(error).toMatch(/no puede superar/i);
  });

  it('rechaza días vacíos', () => {
    expect(parseSeasonRows([row({ minDays: '' })]).error).toMatch(/mínimo y máximo/i);
  });

  it('rechaza un intervalo de cero días', () => {
    expect(parseSeasonRows([row({ minDays: '0', maxDays: '5' })]).error).toMatch(/mayor a cero/i);
  });
});

describe('toRow', () => {
  it('lee una estación existente sin adivinarla desde el rango general', () => {
    const fila = toRow({
      season: 'INVIERNO',
      startMonth: 7,
      endMonth: 9,
      minDaysInterval: 40,
      maxDaysInterval: 45,
      targetDaysInterval: 21,
    });

    expect(fila).toMatchObject({ season: 'INVIERNO', minDays: '40', maxDays: '45', targetDays: '21' });
  });

  it('deja el teórico vacío cuando no hay ninguno', () => {
    const fila = toRow({
      season: 'VERANO',
      startMonth: 1,
      endMonth: 3,
      minDaysInterval: 30,
      maxDaysInterval: 35,
      targetDaysInterval: null,
    });

    expect(fila.targetDays).toBe('');
  });
});

describe('newRow', () => {
  it('elige la primera estación libre', () => {
    expect(newRow(['VERANO']).season).toBe('OTONO');
    expect(newRow(['VERANO', 'OTONO', 'INVIERNO']).season).toBe('PRIMAVERA');
  });
});

describe('SEASONS', () => {
  it('cubre el año completo sin huecos ni solapes', () => {
    const meses = Object.values(SEASONS).flatMap((s) => {
      const out: number[] = [];
      for (let m = s.startMonth; m <= s.endMonth; m++) out.push(m);
      return out;
    });

    expect(meses.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe('monthName', () => {
  it('nombra los meses de la ventana anual', () => {
    expect(monthName(12)).toBe('dic');
    expect(monthName(1)).toBe('ene');
  });
});
