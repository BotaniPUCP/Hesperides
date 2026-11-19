import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Figures of the reports with the «es» locale: decimal comma and no thousands
 * separator below five digits («25,0 %», «1000 de 4000 m²»), as the acceptance
 * criteria read (SPEC-202 §7.5). Other screens use «es-PE»; the difference is
 * deliberate and limited to this module.
 */
const ONE_DECIMAL = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const INTEGER = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
const NBSP = ' ';

export function formatPercent(value: number | null): string | null {
  return value === null ? null : `${ONE_DECIMAL.format(value)}${NBSP}%`;
}

export function formatCount(value: number): string {
  return INTEGER.format(value);
}

export function formatArea(value: number): string {
  return `${INTEGER.format(Math.round(value))}${NBSP}m²`;
}

export function formatAreaOf(covered: number, total: number): string {
  return `${INTEGER.format(Math.round(covered))} de ${formatArea(total)}`;
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** «Del 1 al 31 de octubre de 2026», or both months when the period spans two. */
export function formatPeriod(fromIso: string, toIso: string): string {
  const from = parseISO(fromIso);
  const to = parseISO(toIso);
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  const start = sameMonth ? format(from, 'd', { locale: es })
    : format(from, sameYear ? "d 'de' MMMM" : "d 'de' MMMM 'de' yyyy", { locale: es });
  return `Del ${start} al ${formatDate(toIso)}`;
}

/** «octubre de 2026» for a «2026-10» month. */
export function formatMonth(month: string): string {
  return format(parseISO(`${month}-01`), "MMMM 'de' yyyy", { locale: es });
}

/** «octubre», for the comparison against the previous month. */
export function formatMonthName(month: string): string {
  return format(parseISO(`${month}-01`), 'MMMM', { locale: es });
}

/** «oct», for a chart axis. */
export function formatMonthShort(month: string): string {
  return format(parseISO(`${month}-01`), 'MMM', { locale: es }).replace('.', '');
}

/** A signed variation with its arrow: «▲ 4,8», «▼ 2», «= 0». */
export function formatDelta(delta: number, unit: 'PERCENT' | 'COUNT'): string {
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '=';
  const size = Math.abs(delta);
  return `${arrow} ${unit === 'PERCENT' ? ONE_DECIMAL.format(size) : INTEGER.format(size)}`;
}
