import type { CredentialStatus } from '@shared/types';
import { Badge } from '@/components/ui';
import type { BadgeColor } from '@/components/ui';

export interface CredentialStatusBadgeProps {
  status: CredentialStatus;
}

/**
 * Traduce el estado de entrega a lenguaje del administrador. El backend habla en
 * inglés técnico (SPEC-000); traducir es trabajo del frontend.
 */
const PRESENTACION: Record<CredentialStatus, { label: string; color: BadgeColor }> = {
  // Warning y no danger: nadie se equivocó, hay algo que hacer.
  PENDING_DELIVERY: { label: 'Entrega pendiente', color: 'warning' },
  DELIVERED: { label: 'Credenciales enviadas', color: 'success' },
};

export function CredentialStatusBadge({ status }: CredentialStatusBadgeProps) {
  const { label, color } = PRESENTACION[status];
  return <Badge label={label} color={color} />;
}
