import type { SeasonKey, SeasonalInterval } from '@shared/types';

/**
 * Las cuatro estaciones con los meses que abarcan en Lima.
 *
 * Los meses se envian al backend como dato, no se derivan alli del nombre: asi
 * el evaluador no necesita una tabla de conversion y el cliente puede ajustar
 * los periodos si su realidad agronomica difiere.
 */
export const SEASONS: Record<SeasonKey, {
  label: string;
  desc: string;
  startMonth: number;
  endMonth: number;
}> = {
  VERANO: { label: 'Verano', desc: 'Ene-Mar · mayor radiación, crecimiento acelerado', startMonth: 1, endMonth: 3 },
  OTONO: { label: 'Otoño', desc: 'Abr-Jun · transición, crecimiento moderado', startMonth: 4, endMonth: 6 },
  INVIERNO: { label: 'Invierno', desc: 'Jul-Set · menor radiación, crecimiento lento', startMonth: 7, endMonth: 9 },
  PRIMAVERA: { label: 'Primavera', desc: 'Oct-Dic · rebrote y floración activa', startMonth: 10, endMonth: 12 },
};

export const SEASON_ORDER: SeasonKey[] = ['VERANO', 'OTONO', 'INVIERNO', 'PRIMAVERA'];

/** Ventanas anuales frecuentes; `start > end` cruza el fin de año a propósito. */
export const ANNUAL_WINDOWS = [
  { value: 'DEC_JAN', label: 'Diciembre – Enero (cierre de campus)', startMonth: 12, endMonth: 1 },
  { value: 'JUL_AUG', label: 'Julio – Agosto (receso de medio año)', startMonth: 7, endMonth: 8 },
] as const;

/** Fila del formulario: los campos son texto porque un input vacío no es 0. */
export interface SeasonRow {
  id: string;
  season: SeasonKey;
  minDays: string;
  maxDays: string;
  targetDays: string;
}

export function toRow(s: SeasonalInterval): SeasonRow {
  return {
    id: `${s.season}-${s.startMonth}`,
    season: s.season,
    minDays: String(s.minDaysInterval),
    maxDays: String(s.maxDaysInterval),
    targetDays: s.targetDaysInterval != null ? String(s.targetDaysInterval) : '',
  };
}

export function newRow(used: SeasonKey[]): SeasonRow {
  const next = SEASON_ORDER.find((k) => !used.includes(k)) ?? 'PRIMAVERA';
  return { id: `${next}-${Date.now()}`, season: next, minDays: '', maxDays: '', targetDays: '' };
}

export interface SeasonParseResult {
  seasons?: SeasonalInterval[];
  error?: string;
}

/**
 * Convierte las filas del formulario en intervalos que el backend puede evaluar.
 *
 * Valida aquí lo mismo que el servidor rechaza, para que el usuario lo vea sin
 * esperar un 422. La validación del servidor sigue mandando: esta es una
 * cortesía de la interfaz, no la garantía.
 */
export function parseSeasonRows(rows: SeasonRow[]): SeasonParseResult {
  if (rows.length === 0) {
    return { error: 'Agrega al menos una estación o elige intervalo uniforme' };
  }

  const vistas = new Set<SeasonKey>();
  const seasons: SeasonalInterval[] = [];

  for (const row of rows) {
    const meta = SEASONS[row.season];
    if (vistas.has(row.season)) {
      return { error: `${meta.label} está configurada más de una vez` };
    }
    vistas.add(row.season);

    const min = Number.parseInt(row.minDays, 10);
    const max = Number.parseInt(row.maxDays, 10);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      return { error: `Indica los días mínimo y máximo de ${meta.label}` };
    }
    if (min <= 0) {
      return { error: `El intervalo de ${meta.label} debe ser mayor a cero` };
    }
    if (min > max) {
      return { error: `En ${meta.label}, el mínimo (${min}) no puede superar al máximo (${max})` };
    }

    const target = row.targetDays ? Number.parseInt(row.targetDays, 10) : null;
    if (target !== null && (Number.isNaN(target) || target <= 0)) {
      return { error: `El intervalo teórico de ${meta.label} debe ser mayor a cero` };
    }

    seasons.push({
      season: row.season,
      startMonth: meta.startMonth,
      endMonth: meta.endMonth,
      minDaysInterval: min,
      maxDaysInterval: max,
      targetDaysInterval: target,
    });
  }

  return { seasons };
}

/** Resumen legible de una estación, para la tabla. */
export function describeSeason(s: SeasonalInterval): string {
  const label = SEASONS[s.season]?.label ?? s.season;
  return `${label}: ${s.minDaysInterval}-${s.maxDaysInterval}d`;
}

export function monthName(month: number): string {
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                   'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  return nombres[month - 1] ?? String(month);
}
