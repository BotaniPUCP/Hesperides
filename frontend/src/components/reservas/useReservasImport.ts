'use client';

import { useState } from 'react';
import type { ReservationImportOutcome, ReservationImportPlan } from '@shared/types';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { mensajeDeApiError } from '@/lib/api-errors';
import { guardarArchivo } from '@/lib/download';
import { reservationsApi } from '@/lib/reservations-api';

const TEMPLATE = 'reservas.csv';

/**
 * El registro masivo en el ciclo común de cargas (SPEC-107 §5.4): la revisión
 * abre un lote en el servidor y la confirmación escribe lo revisado.
 */
export function useReservasImport() {
  const [file, setFileState] = useState<File | null>(null);
  const [plan, setPlan] = useState<ReservationImportPlan | null>(null);
  const [outcome, setOutcome] = useState<ReservationImportOutcome | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cambia para vaciar el campo de archivo: así el mismo archivo se puede volver a elegir.
  const [fileInputKey, setFileInputKey] = useState(0);
  const guard = useUnsavedChangesGuard(outcome === null && (file !== null || plan !== null));

  async function run(step: () => Promise<void>) {
    setWorking(true);
    setError(null);
    try {
      await step();
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setWorking(false);
    }
  }

  function setFile(next: File | null) {
    setFileState(next);
    setPlan(null);
    setOutcome(null);
    setError(null);
  }

  const review = () => run(async () => setPlan(await reservationsApi.previewImport(file!)));
  const confirm = () => run(async () => {
    setOutcome(await reservationsApi.confirmImport(plan!.batchId));
    setPlan(null);
    setFileState(null);
    setFileInputKey((k) => k + 1);
  });
  const template = () => run(async () => guardarArchivo(await reservationsApi.importTemplate(), TEMPLATE));

  return {
    file, fileInputKey, setFile, plan, outcome, working, error, review, confirm, template,
    canConfirm: plan !== null && plan.canConfirm,
    avisoSinGuardar: guard.dialog,
  };
}
