import { Badge } from '@/components/ui';

/** Evita confundir una respuesta antigua sin estado con una especie inactiva. */
export function SpeciesStatusBadge({ isActive, inactiveLabel = 'Inactiva' }: { isActive?: boolean | null; inactiveLabel?: string }) {
  if (isActive === true) return null;

  const isInactive = isActive === false;
  return (
    <Badge
      label={isInactive ? inactiveLabel : 'Estado no disponible'}
      color={isInactive ? 'warning' : 'neutral'}
    />
  );
}
