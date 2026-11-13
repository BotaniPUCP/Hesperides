'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Reservation } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, EmptyState, LoadingSkeleton } from '@/components/ui';
import { SetMap } from '@/components/planning/SetMap';
import { useCanMaintainReservations, useCanRecordUsage, useReservation, useReservationCheck } from '@/hooks/useReservations';
import { formatDay, isEditable } from '@/lib/reservation-format';
import { CancelReservationDialog } from './CancelReservationDialog';
import { ReservationDetails } from './ReservationDetails';
import { ResponsibleChangeForm } from './ResponsibleChangeForm';
import { ReservationWarnings } from './ReservationWarnings';

/** Una reserva es de un jardín: el mapa no marca ejemplares. Constante para no redibujar en cada render. */
const NO_SPECIMENS: string[] = [];

interface Props {
  code: string;
  startEditing?: boolean;
  /** La reserva acaba de crearse: banner de confirmación y avisos del horario (§5.1). */
  created?: boolean;
}

/** La ficha de una reserva (SPEC-107 §5.2). Editar es en línea, solo ADMIN y COORDINADOR. */
export function ReservationDetailScreen({ code, startEditing = false, created = false }: Props) {
  const router = useRouter();
  const canMaintain = useCanMaintainReservations();
  const canRecordUsage = useCanRecordUsage();
  // Las respuestas de cambiar, confirmar o anular no traen historiales ni secciones: se pide la ficha entera.
  const { reservation, loading, errorMessage, notFound, reload } = useReservation(code);
  const [editing, setEditing] = useState(startEditing);
  const [cancelling, setCancelling] = useState(false);
  const [warnings, setWarnings] = useState<Reservation['warnings']>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Al llegar de un alta, los avisos al guardar se consultan con los datos de la
  // propia reserva: son derivados y salen iguales a los del formulario (§5.1).
  const justCreated = useReservationCheck(created && reservation !== null && isEditable(reservation.state)
    ? { placeId: reservation.place.id, startsAt: reservation.startsAt, endsAt: reservation.endsAt,
        excludeCode: reservation.code }
    : null);

  function leaveEditing() {
    setEditing(false);
    if (startEditing) router.replace(`/reservas/${code}`);
  }

  if (loading && reservation === null) return <LoadingSkeleton variant="text" count={8} />;
  if (notFound || (reservation === null && errorMessage === null)) {
    return <EmptyState title="Reserva no encontrada" description="Puede que el enlace esté mal escrito o que ya no tengas acceso." />;
  }
  if (reservation === null) {
    return <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{errorMessage}</p>;
  }

  const editable = canMaintain && isEditable(reservation.state);

  if (editing && editable) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Editar ${reservation.code}`}
          description={`${reservation.place.name} · ${formatDay(reservation.startsAt.slice(0, 10), true)}`} />
        <ResponsibleChangeForm reservation={reservation} onCancel={leaveEditing}
          onSaved={(saved) => {
            reload();
            setWarnings([]);
            setNotice(`Responsable de ${saved.code} actualizado.`);
            leaveEditing();
          }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Reserva ${reservation.code}`}
        description={`${reservation.place.name} · Pedido de ${reservation.requestedBy.name}
          ${reservation.requestedFor ? ` para ${reservation.requestedFor.name}` : ''}`}
        actions={
          <>
            {canMaintain && (
              <Link href="/reservas/nueva"
                className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50">
                Nueva reserva
              </Link>
            )}
            <Link href={`/reservas?jardin=${reservation.place.id}`}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50">
              Ver en la agenda
            </Link>
            {editable && (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>Editar</Button>
                <Button variant="danger" onClick={() => setCancelling(true)}>Anular</Button>
              </>
            )}
          </>
        } />

      {created && (
        <p role="status" className="rounded-md bg-alert-success-bg p-3 text-sm text-alert-success-fg">
          Reserva {reservation.code} registrada para {reservation.place.name}.
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-md bg-alert-success-bg p-3 text-sm text-alert-success-fg">{notice}</p>
      )}
      {(warnings.length > 0 ? warnings : created ? justCreated.warnings : []).length > 0 && (
        <ReservationWarnings warnings={warnings.length > 0 ? warnings : justCreated.warnings}
          title="Avisos al guardar" />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ReservationDetails reservation={reservation} canMaintain={canMaintain}
          canRecordUsage={canRecordUsage} updateData={reload} />
        <div className="h-[360px] lg:h-auto lg:min-h-[480px]">
          <SetMap zoneCodes={reservation.place.sectionCodes} specimenCodes={NO_SPECIMENS} className="h-full" />
        </div>
      </div>

      <CancelReservationDialog reservation={cancelling ? reservation : null}
        onClose={() => setCancelling(false)}
        onCancelled={(cancelled) => {
          reload();
          setWarnings([]);
          setNotice(`Reserva ${cancelled.code} anulada.`);
        }} />
    </div>
  );
}
