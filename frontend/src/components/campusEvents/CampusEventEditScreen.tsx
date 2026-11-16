'use client';

import { LoadingSkeleton } from '@/components/ui';
import { useCanMaintainCampusEvents, useCampusEvent } from '@/hooks/useCampusEvents';
import { CampusEventForm } from './CampusEventForm';

/** Editar un evento (SPEC-114 §5.3): solo coordinación; carga el evento antes de mostrar el formulario. */
export function CampusEventEditScreen({ id }: { id: string }) {
  const canMaintain = useCanMaintainCampusEvents();
  const numeric = /^d+$/.test(id) ? Number(id) : null;
  const { event, errorMessage, notFound } = useCampusEvent(canMaintain ? numeric : null);

  if (!canMaintain) return <p role="alert" className="text-sm text-action-danger">No tienes permiso para editar eventos.</p>;
  if (numeric === null || notFound) return <p role="alert" className="text-sm text-action-danger">El evento no existe o ya se dio de baja.</p>;
  if (errorMessage) return <p role="alert" className="text-sm text-action-danger">{errorMessage}</p>;
  if (!event) return <LoadingSkeleton />;
  return <CampusEventForm event={event} />;
}
