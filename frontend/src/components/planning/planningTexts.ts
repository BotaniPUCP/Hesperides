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

/** «30 sep» a partir de «2026-09-30» (con el año si no es el de hoy), sin pasar por zonas horarias. */
export function shortDate(iso: string, now: Date = new Date()): string {
  const [year, month, day] = iso.split('-').map(Number);
  // De otro año se dice cuál: «22 jul» de hace más de un año se leería como de este.
  return year === now.getFullYear() ? `${day} ${SHORT_MONTHS[month - 1]}` : `${day} ${SHORT_MONTHS[month - 1]} ${year}`;
}

function daysAgo(n: number): string {
  return n === 0 ? 'hoy' : `hace ${plural(n, 'día', 'días')}`;
}

/**
 * Cuántos jardines y ejemplares de la fila, como se diga mejor: el avance y los
 * «sin registro previo» cuentan las dos cosas juntas.
 */
export function unitsLabel(row: PlanningRow, n: number): string {
  if (row.elementCount === 0) return gardensLabel(n);
  if (row.zoneCount === 0) return specimensLabel(n);
  return plural(n, 'jardín o ejemplar', 'jardines o ejemplares');
}

export function rowTitle(row: PlanningRow): string {
  return `${row.activityLabel ?? 'Actividad'} en ${row.setName}`;
}

export const STATE_LABELS: Record<PlanningRow['state'], string> = {
  OVERDUE: 'Atrasada',
  DUE: 'Pendiente',
  IN_PROGRESS: 'En curso',
  SCHEDULED: 'Programada',
  NOT_DUE: 'Al día',
  DONE_FOR_PERIOD: 'Cumplido',
  NOT_CONFIGURED: 'Sin frecuencia configurada',
};

export function stateLabel(row: PlanningRow): string {
  return STATE_LABELS[row.state];
}

/** «falta 1 día», «faltan 3 días». */
const missing = (count: number) => (count === 1 ? 'falta' : 'faltan');

export function stateDetail(row: PlanningRow): string {
  const days = row.days ?? 0;
  const window = row.ruleKind === 'ANNUAL_WINDOW';
  const quota = row.ruleKind === 'SEASONAL_PERIOD';
  switch (row.state) {
    case 'OVERDUE':
      return window ? `(la ventana cerró hace ${plural(days, 'día', 'días')})` : `(${plural(days, 'día', 'días')} tarde)`;
    case 'DUE':
      if (row.days === null && row.neverAttendedCount > 0) return `${unitsLabel(row, row.neverAttendedCount)} sin registro previo`;
      if (quota && row.estimatedDate) return `(próxima estimada: ${shortDate(row.estimatedDate)})`;
      return days === 0 ? '(vence hoy)' : `(quedan ${plural(days, 'día', 'días')} de plazo)`;
    case 'IN_PROGRESS':
      return `(${missing(days)} ${unitsLabel(row, days)})`;
    case 'SCHEDULED':
      return row.openIntervention ? `(para el ${shortDate(row.openIntervention.scheduledDate)})` : '';
    case 'NOT_DUE':
      if (window) return `(la ventana abre en ${plural(days, 'día', 'días')})`;
      if (quota && row.estimatedDate) return `(próxima estimada: ${shortDate(row.estimatedDate)})`;
      return `(${missing(days)} ${plural(days, 'día', 'días')})`;
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

/**
 * Cuando solo una parte del conjunto quedó al día: cuántas unidades lo están, de cuántas, y las
 * que faltan. Null si están todas al día, ninguna, o la fila ya muestra su avance (en curso).
 */
export function partialProgress(row: PlanningRow): { upToDate: number; total: number; pending: number } | null {
  const total = row.zoneCount + row.elementCount;
  const upToDate = row.upToDateCount;
  if (upToDate === null || upToDate === 0 || upToDate >= total || row.state === 'IN_PROGRESS') return null;
  return { upToDate, total, pending: total - upToDate };
}

/** Lo que falta, por tipo: «2 jardines», «3 ejemplares», «1 jardín y 2 ejemplares». */
export function pendingLabel(row: PlanningRow): string {
  const zones = row.pendingZoneIds.length;
  const specimens = row.pendingElementIds.length;
  if (specimens === 0) return gardensLabel(zones);
  if (zones === 0) return specimensLabel(specimens);
  return `${gardensLabel(zones)} y ${specimensLabel(specimens)}`;
}

/** La historia de la fila para la tarjeta: el avance si está en curso; si no, la última vez. */
export function historyLine(row: PlanningRow, now: Date = new Date()): { label: string; value: string } {
  const started = row.openIntervention?.startedDate;
  if (row.state === 'IN_PROGRESS' && started && row.progress) {
    const [y, m, d] = started.split('-').map(Number);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const since = Math.round((today - Date.UTC(y, m - 1, d)) / 86_400_000);
    return { label: 'Avance', value: `${row.progress.done} de ${unitsLabel(row, row.progress.total)} · empezó el ${shortDate(started, now)} (${daysAgo(since)})` };
  }
  // Atendidos en fechas distintas: cada fecha con cuántos, para que no parezca que no se hizo nada.
  if (row.lastDates.length > 1) {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const when = (date: string | null) => (date === null ? 'sin registro' : date === today ? 'hoy' : shortDate(date, now));
    const shown = row.lastDates.slice(0, 3).map((d) => `${when(d.date)} (${d.count})`);
    return { label: 'Última vez', value: shown.join(' · ') + (row.lastDates.length > 3 ? ' · …' : '') };
  }
  if (!row.lastDate || row.daysSinceLast === null) return { label: 'Última vez', value: 'Sin registro previo' };
  return { label: 'Última vez', value: `${shortDate(row.lastDate, now)} (${daysAgo(row.daysSinceLast)})` };
}
