/** La cola de migración, a la que vuelve un lugar creado desde ella. */
export const MIGRATION_PATH = '/lugares/migracion';

/**
 * A dónde vuelve el formulario según `?desde=`. Solo orígenes conocidos: una
 * dirección arbitraria en la URL serviría para mandar a la persona fuera del sistema.
 */
export function returnPathFrom(origin: string | undefined): string | undefined {
  return origin === 'migracion' ? MIGRATION_PATH : undefined;
}
