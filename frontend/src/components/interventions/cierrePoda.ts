import type { SpecimenDetail } from '@shared/types';

/** Lo que se decide sobre las medidas de un ejemplar al cerrar una poda (SPEC-105 §5.3). */
export type OpcionMedida = 'UNCHANGED' | 'AVERAGE' | 'MEASURED';

export interface DecisionPoda {
  opcion: OpcionMedida;
  fecha: string;
  altura: string;
  fuste: string;
  dap: string;
  copa: string;
}

export interface OpcionVisible {
  valor: OpcionMedida;
  etiqueta: string;
}

export interface MeasurementOutcomeForm {
  specimenCode: string;
  outcome: OpcionMedida;
  measurement?: {
    date: string;
    heightM: number | null;
    trunkHeightM: number | null;
    dbhCm: number | null;
    crownRadiusM: number | null;
  };
}

export function decisionInicial(hoy: string): DecisionPoda {
  return { opcion: 'UNCHANGED', fecha: hoy, altura: '', fuste: '', dap: '', copa: '' };
}

/**
 * Solo las opciones que cambian algo para este ejemplar. En uno que ya muestra el
 * promedio, «dejarlo en promedio» y «no cambiar» son lo mismo, así que hay una sola.
 */
export function opcionesDe(ejemplar: SpecimenDetail): OpcionVisible[] {
  const medir: OpcionVisible = { valor: 'MEASURED', etiqueta: 'Medidas reales' };
  if (ejemplar.measurementStatus === 'REFERENCE') {
    return [{ valor: 'UNCHANGED', etiqueta: 'Dejar en promedio' }, medir];
  }
  const noCambiar: OpcionVisible = { valor: 'UNCHANGED', etiqueta: 'No cambiar' };
  return ejemplar.speciesCritical
    ? [noCambiar, medir]
    : [noCambiar, { valor: 'AVERAGE', etiqueta: 'Usar promedio' }, medir];
}

const vacio = (texto: string) => texto.trim() === '';
const numero = (texto: string) => Number(texto.trim().replace(',', '.'));
const opcional = (texto: string) => (vacio(texto) ? null : numero(texto));

const positivo = (texto: string) => vacio(texto) || (Number.isFinite(numero(texto)) && numero(texto) > 0);
const noNegativo = (texto: string) => vacio(texto) || (Number.isFinite(numero(texto)) && numero(texto) >= 0);

export function errorDeDecision(d: DecisionPoda, hoy: string): string | null {
  if (d.opcion !== 'MEASURED') return null;
  if (!d.fecha) return 'Indica la fecha de la medición.';
  if (d.fecha > hoy) return 'La fecha de la medición no puede ser futura.';
  if ([d.altura, d.fuste, d.dap, d.copa].every(vacio)) return 'Indica al menos una medida.';
  if (!positivo(d.altura)) return 'La altura debe ser mayor que 0.';
  if (!positivo(d.copa)) return 'El radio de copa debe ser mayor que 0.';
  if (!noNegativo(d.fuste)) return 'El fuste no puede ser negativo.';
  if (!noNegativo(d.dap)) return 'El DAP no puede ser negativo.';
  return null;
}

/** Un ejemplar sin cambios no viaja: el backend lo trata igual si falta. */
export function aOutcomes(decisiones: Record<string, DecisionPoda>): MeasurementOutcomeForm[] {
  return Object.entries(decisiones)
    .filter(([, d]) => d.opcion !== 'UNCHANGED')
    .map(([specimenCode, d]) => d.opcion === 'AVERAGE'
      ? { specimenCode, outcome: 'AVERAGE' as const }
      : {
          specimenCode,
          outcome: 'MEASURED' as const,
          measurement: {
            date: d.fecha,
            heightM: opcional(d.altura),
            trunkHeightM: opcional(d.fuste),
            dbhCm: opcional(d.dap),
            crownRadiusM: opcional(d.copa),
          },
        });
}
