import { Badge } from '@/components/ui/Badge';
import type { CredentialStatus } from '@/lib/auth-context';

/**
 * Estado de entrega de credenciales en el listado (SPEC-100 §7.1): el badge
 * ámbar "Correo no entregado" aparece solo cuando credentialStatus es
 * PENDING_DELIVERY; en DELIVERED no se renderiza nada.
 */
export interface CredentialStatusBadgeProps {
  status: CredentialStatus;
}

export function CredentialStatusBadge({ status }: CredentialStatusBadgeProps) {
  if (status !== 'PENDING_DELIVERY') return null;
  return <Badge label="Correo no entregado" color="warning" />;
}