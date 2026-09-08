/**
 * Incluye los falsy que produce `condicion && 'clase'` cuando la condición no
 * es booleana: un ReactNode vacío evalúa a 0, "" o 0n, no a false.
 */
type ClassValue = string | number | bigint | false | null | undefined;

/**
 * Une clases de Tailwind descartando las condicionales que no aplican.
 * Existe para no repetir `[a, b].filter(Boolean).join(' ')` en cada componente.
 */
export function cn(...classes: ClassValue[]): string {
  // Solo sobreviven las cadenas no vacías: un 0 procedente de `nodo && 'clase'`
  // se descarta en vez de acabar como la clase literal "0".
  return classes.filter((value): value is string => typeof value === 'string' && value !== '').join(' ');
}
