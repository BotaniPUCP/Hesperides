'use client';

import Link from 'next/link';
import type { ReservationImportOutcome } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, EmptyState } from '@/components/ui';
import { useCanMaintainReservations } from '@/hooks/useReservations';
import { EstandarDeReservas } from './EstandarDeReservas';
import { ReservationImportPreview } from './ReservationImportPreview';
import { useReservasImport } from './useReservasImport';

function Resultado({ outcome }: { outcome: ReservationImportOutcome }) {
  return (
    <div className="space-y-2">
      <p role="status" className="rounded-md bg-alert-success-bg p-3 text-sm text-alert-success-fg">
        Listo. Se registraron {outcome.created} {outcome.created === 1 ? 'reserva' : 'reservas'}.
      </p>
      <Link href="/reservas" className="text-sm text-brand-700 underline">Ver la agenda</Link>
    </div>
  );
}

/**
 * Registro masivo de reservas (SPEC-107 §5.4) en el ciclo común de cargas: se
 * revisa el archivo, el servidor guarda la revisión y se confirma lo revisado.
 * Es todo o nada.
 */
export function RegistroMasivoReservasScreen() {
  const canMaintain = useCanMaintainReservations();
  const imp = useReservasImport();

  if (!canMaintain) {
    return (
      <div className="surface-card">
        <EmptyState title="Registro masivo de reservas"
          description="Solo coordinación registra reservas por archivo." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Registro masivo de reservas"
        description="Sube un CSV con muchas reservas. Primero se revisa; si una fila tiene error, no se guarda ninguna. Los cruces y el trabajo cercano solo avisan."
        actions={
          <Link href="/reservas"
            className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50">
            Volver a la agenda
          </Link>
        } />

      <section className="surface-card space-y-4" aria-label="Archivo">
        <EstandarDeReservas />
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-neutral-900">
            Archivo CSV
            <input key={imp.fileInputKey} type="file" accept=".csv,text/csv"
              className="mt-1 block text-sm" onChange={(event) => imp.setFile(event.target.files?.[0] ?? null)} />
          </label>
          <Button variant="secondary" onClick={imp.template} disabled={imp.working}>Descargar plantilla</Button>
          <Button onClick={imp.review} disabled={!imp.file} loading={imp.working && imp.plan === null}>
            Revisar archivo
          </Button>
        </div>
        {imp.error && (
          <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{imp.error}</p>
        )}
        {imp.outcome && <Resultado outcome={imp.outcome} />}
        {imp.plan && (
          <>
            <ReservationImportPreview plan={imp.plan} />
            <div className="flex justify-end">
              <Button onClick={imp.confirm} loading={imp.working} disabled={!imp.canConfirm}>
                Confirmar registro
              </Button>
            </div>
          </>
        )}
      </section>
      {imp.avisoSinGuardar}
    </div>
  );
}
