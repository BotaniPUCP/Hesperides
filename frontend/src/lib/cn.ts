type ClassValue = string | false | null | undefined;

/**
 * Une clases de Tailwind descartando las condicionales que no aplican.
 * Existe para no repetir `[a, b].filter(Boolean).join(' ')` en cada componente.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
