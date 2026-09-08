import { Badge } from './Badge';
import type { BadgeColor } from './Badge';

/**
 * Pinta cualquier estado de flujo del sistema (incidencia, intervención,
 * contrato). El color lo decide el code del catálogo contra la tabla única de
 * SPEC-C01 §3.1; un code desconocido cae en neutral con aviso en consola en
 * desarrollo (nunca en producción).
 */
export interface StatusBadgeProps {
  code: string;
  label: string;
}

const mapping: Record<string, BadgeColor> = {
  REPORTED: 'neutral',
  ASSIGNED: 'neutral',
  IN_REVIEW: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  COMPLETED: 'warning',
  VALIDATED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export function StatusBadge({ code, label }: StatusBadgeProps) {
  const color = mapping[code];
  if (color === undefined && process.env.NODE_ENV === 'development') {
    console.warn(`StatusBadge: sin color para el code "${code}"`);
  }
  return <Badge label={label} color={color ?? 'neutral'} />;
}