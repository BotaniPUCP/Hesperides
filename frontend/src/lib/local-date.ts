/**
 * Fecha AAAA-MM-DD del calendario local, la que usa un <input type="date">.
 * `toISOString` daría la fecha UTC: en Lima, desde las 19:00 ya sería mañana.
 */
export function dateLocal(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

/** Campus civil date, even when the browser is in another time zone. */
export function todayLima(day = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(day);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function todayLocal(): string {
  return dateLocal(new Date());
}
