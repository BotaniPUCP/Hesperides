/**
 * Fecha AAAA-MM-DD del calendario local, la que usa un <input type="date">.
 * `toISOString` daría la fecha UTC: en Lima, desde las 19:00 ya sería mañana.
 */
export function dateLocal(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

export function todayLocal(): string {
  return dateLocal(new Date());
}
