import type { SpecimenDetail } from '@shared/types';
import { p01Detail } from '@/components/inventario-verde/__fixtures__/inventario';
import { aOutcomes, decisionInicial, errorDeDecision, opcionesDe } from '../cierrePoda';

const HOY = '2026-11-07';

function ejemplar(parcial: Partial<SpecimenDetail>): SpecimenDetail {
  return { ...p01Detail, ...parcial };
}

const etiquetas = (s: SpecimenDetail) => opcionesDe(s).map((o) => o.etiqueta);

describe('opcionesDe', () => {
  it('no crítica sin medir: dejar en promedio o medir', () => {
    expect(etiquetas(ejemplar({ speciesCritical: false, measurementStatus: 'REFERENCE' })))
      .toEqual(['Dejar en promedio', 'Medidas reales']);
  });

  it('no crítica medida: las tres opciones', () => {
    expect(etiquetas(ejemplar({ speciesCritical: false, measurementStatus: 'MEASURED' })))
      .toEqual(['No cambiar', 'Usar promedio', 'Medidas reales']);
  });

  it('crítica sin medir: nunca ofrece el promedio', () => {
    expect(etiquetas(ejemplar({ speciesCritical: true, measurementStatus: 'NOT_MEASURED' })))
      .toEqual(['No cambiar', 'Medidas reales']);
  });

  it('crítica medida: nunca ofrece el promedio', () => {
    expect(etiquetas(ejemplar({ speciesCritical: true, measurementStatus: 'MEASURED' })))
      .toEqual(['No cambiar', 'Medidas reales']);
  });

  it('la primera opción nunca escribe nada', () => {
    expect(opcionesDe(ejemplar({ speciesCritical: false, measurementStatus: 'REFERENCE' }))[0].valor).toBe('UNCHANGED');
    expect(opcionesDe(ejemplar({ speciesCritical: true, measurementStatus: 'MEASURED' }))[0].valor).toBe('UNCHANGED');
  });
});

describe('aOutcomes', () => {
  it('quien no cambia no viaja', () => {
    expect(aOutcomes({ 'EV-1': decisionInicial(HOY) })).toEqual([]);
  });

  it('el promedio viaja sin medidas', () => {
    expect(aOutcomes({ 'EV-1': { ...decisionInicial(HOY), opcion: 'AVERAGE' } }))
      .toEqual([{ specimenCode: 'EV-1', outcome: 'AVERAGE' }]);
  });

  it('las medidas reales convierten la coma decimal y dejan nulo lo vacío', () => {
    const decision = { opcion: 'MEASURED' as const, fecha: HOY, altura: '2,5', fuste: '', dap: '0', copa: '1.2' };
    expect(aOutcomes({ 'EV-1': decision })).toEqual([{
      specimenCode: 'EV-1',
      outcome: 'MEASURED',
      measurement: { date: HOY, heightM: 2.5, trunkHeightM: null, dbhCm: 0, crownRadiusM: 1.2 },
    }]);
  });
});

describe('errorDeDecision', () => {
  const medida = { opcion: 'MEASURED' as const, fecha: HOY, altura: '2', fuste: '', dap: '', copa: '' };

  it('las opciones que no miden no se validan', () => {
    expect(errorDeDecision(decisionInicial(HOY), HOY)).toBeNull();
    expect(errorDeDecision({ ...medida, opcion: 'AVERAGE', altura: 'x' }, HOY)).toBeNull();
  });

  it('una medida válida pasa', () => {
    expect(errorDeDecision(medida, HOY)).toBeNull();
  });

  it('un DAP de 0 es una medida real', () => {
    expect(errorDeDecision({ ...medida, altura: '', dap: '0' }, HOY)).toBeNull();
  });

  it('exige al menos una medida', () => {
    expect(errorDeDecision({ ...medida, altura: '' }, HOY)).toBe('Indica al menos una medida.');
  });

  it.each([
    [{ altura: '0' }, 'La altura debe ser mayor que 0.'],
    [{ altura: 'abc' }, 'La altura debe ser mayor que 0.'],
    [{ copa: '-1' }, 'El radio de copa debe ser mayor que 0.'],
    [{ fuste: '-1' }, 'El fuste no puede ser negativo.'],
    [{ dap: '-1' }, 'El DAP no puede ser negativo.'],
  ])('rechaza %j', (parcial, mensaje) => {
    expect(errorDeDecision({ ...medida, ...parcial }, HOY)).toBe(mensaje);
  });

  it('exige una fecha que no sea futura', () => {
    expect(errorDeDecision({ ...medida, fecha: '' }, HOY)).toBe('Indica la fecha de la medición.');
    expect(errorDeDecision({ ...medida, fecha: '2026-11-08' }, HOY)).toBe('La fecha de la medición no puede ser futura.');
  });
});
