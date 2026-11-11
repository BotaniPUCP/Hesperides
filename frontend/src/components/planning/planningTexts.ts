import type { PlanningRow } from '@shared/types';

/**
 * Textos de la planificación preventiva (SPEC-203 §7). En pantalla nunca se dice
 * «ronda», «ritmo», «alcance» ni «scope», ni se marca si la regla es propia.
 */

/** Cuántos días antes de que toque, una fila ya se avisa en el inicio. */
export const NEAR_DUE_DAYS = 7;

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const LONG_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
  'octubre', 'noviembre', 'diciembre'];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** «1 jardín», «18 jardines». */
export function gardensLabel(count: number): string {
  return plural(count, 'jardín', 'jardines');
}

/** «1 ejemplar», «12 ejemplares». */
export function specimensLabel(count: number): string {
  return plural(count, 'ejemplar', 'ejemplares');
}

/** Lo que tiene un conjunto: «18 jardines», «4 ejemplares» o «18 jardines · 4 ejemplares». */
export function contentsLabel(zones: number, specimens: number): string {
  if (specimens === 0) return gardensLabel(zones);
  if (zones === 0) return specimensLabel(specimens);
  return `${gardensLabel(zones)} · ${specimensLabel(specimens)}`;
}

/** «30 sep» a partir de «2026-09-30», sin pasar por zonas horarias. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  return `${day} ${SHORT_MONTHS[month - 1]}`;
}

function daysAgo(n: number): string {
  return n === 0 ? 'hoy' : `hace ${plural(n, 'día', 'días')}`;
}

export function rowTitle(row: PlanningRow): string {
  return `${row.activityLabel ?? 'Actividad'} en ${row.setName}`;
}

const LABELS: Record<PlanningRow['state'], string> = {
  OVERDUE: 'Toca, atrasada',
  DUE: 'Toca',
  IN_PROGRESS: 'En curso',
  SCHEDULED: 'Programada',
  NOT_DUE: 'Aún no toca',
  DONE_FOR_PERIOD: 'Cumplido',
  NOT_CONFIGURED: 'Sin frecuencia configurada',
};

export function stateLabel(row: PlanningRow): string {
  return LABELS[row.state];
}

export function stateDetail(row: PlanningRow): string {
  const days = row.days ?? 0;
  const window = row.ruleKind === 'ANNUAL_WINDOW';
  const quota = row.ruleKind === 'SEASONAL_PERIOD';
  switch (row.state) {
    case 'OVERDUE':
      return window ? `(la ventana cerró hace ${plural(days, 'día', 'días')})` : `(${plural(days, 'día', 'días')} tarde)`;
    case 'DUE':
      if (row.days === null && row.neverAttendedCount > 0) return `${gardensLabel(row.neverAttendedCount)} sin registro previo`;
      if (quota && row.estimatedDate) return `(próxima estimada: ${shortDate(row.estimatedDate)})`;
      return days === 0 ? '(vence hoy)' : `(quedan ${plural(days, 'día', 'días')} de plazo)`;
    case 'IN_PROGRESS':
      return `(faltan ${gardensLabel(days)})`;
    case 'SCHEDULED':
      return row.openIntervention ? `(para el ${shortDate(row.openIntervention.scheduledDate)})` : '';
    case 'NOT_DUE':
      if (window) return `(la ventana abre en ${plural(days, 'día', 'días')})`;
      if (quota && row.estimatedDate) return `(próxima estimada: ${shortDate(row.estimatedDate)})`;
      return `(faltan ${plural(days, 'día', 'días')})`;
    case 'DONE_FOR_PERIOD':
      return quota ? `(${row.yearCount} de ${row.rhythm?.annualTarget} en el año)` : '(hecho en esta ventana)';
    default:
      return '';
  }
}

/** Cada cuánto se hace, en las palabras del usuario. */
export function rhythmText(row: PlanningRow): string {
  const r = row.rhythm;
  if (!r) return '';
  switch (row.ruleKind) {
    case 'INTERVAL_DAYS':
    case 'COVERAGE_CYCLE': {
      const range = r.minDays === r.maxDays ? `${r.minDays}` : `${r.minDays}–${r.maxDays}`;
      return `Cada ${range} días${r.seasonLabel ? ` en ${r.seasonLabel.toLowerCase()}` : ''}`;
    }
    case 'SEASONAL_PERIOD':
      return `${r.annualTarget} al año${row.yearCount !== null ? ` · van ${row.yearCount}` : ''}`;
    case 'ANNUAL_WINDOW':
      return `${r.annualTarget} al año, entre ${LONG_MONTHS[(r.windowStartMonth ?? 1) - 1]} y ${LONG_MONTHS[(r.windowEndMonth ?? 1) - 1]}`;
    default:
      return '';
  }
}

/** La segunda línea de la tarjeta: la cuenta «X de N» solo en curso. */
export function lastLine(row: PlanningRow, now: Date = new Date()): string {
  const started = row.openIntervention?.startedDate;
  if (row.state === 'IN_PROGRESS' && started && row.progress) {
    const [y, m, d] = started.split('-').map(Number);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const since = Math.round((today - Date.UTC(y, m - 1, d)) / 86_400_000);
    return `Empezó: ${shortDate(started)} (${daysAgo(since)}) · ${row.progress.done} de ${gardensLabel(row.progress.total)}`;
  }
  if (!row.lastDate || row.daysSinceLast === null) return `Sin registro previo · ${gardensLabel(row.zoneCount)}`;
  return `Última vez: ${shortDate(row.lastDate)} (${daysAgo(row.daysSinceLast)}) · ${gardensLabel(row.zoneCount)}`;
}
