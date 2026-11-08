'use client';

import { useState } from 'react';
import type { DirectoryImportKind, DirectoryImportOutcome, DirectoryImportPlan } from '@shared/types';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { mensajeDeApiError } from '@/lib/api-errors';
import { directoryApi } from '@/lib/directory-api';
import { guardarArchivo } from '@/lib/download';

/** Los nombres de las plantillas: los mismos de `docs/estandares/plantillas/`. */
const PLANTILLAS: Record<DirectoryImportKind, string> = {
  organizations: 'organizaciones.csv',
  contacts: 'contactos.csv',
};

/**
 * El registro masivo en el ciclo común de cargas: la revisión abre un lote en el
 * servidor y la confirmación escribe lo revisado, sin volver a subir el archivo.
 */
export function useRegistroMasivo() {
  const [kind, setKindState] = useState<DirectoryImportKind | null>(null);
  const [file, setFileState] = useState<File | null>(null);
  const [plan, setPlan] = useState<DirectoryImportPlan | null>(null);
  const [outcome, setOutcome] = useState<DirectoryImportOutcome | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cambia para vaciar el campo de archivo: así el mismo archivo se puede volver a elegir.
  const [fileInputKey, setFileInputKey] = useState(0);
  // Un archivo elegido o una revisión sin confirmar es trabajo que se pierde al salir.
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

  function clear(next: { file: File | null }) {
    setFileState(next.file);
    setPlan(null);
    setOutcome(null);
    setError(null);
  }

  /** Otro tipo es otro estándar: lo elegido se descarta, avisando si había algo. */
  function setKind(next: DirectoryImportKind) {
    if (next === kind) return;
    guard.confirm(() => {
      clear({ file: null });
      setKindState(next);
      setFileInputKey((k) => k + 1);
    });
  }

  const review = () => run(async () => setPlan(await directoryApi.previewImport(kind!, file!)));
  const confirm = () => run(async () => {
    setOutcome(await directoryApi.confirmImport(plan!.batchId));
    setPlan(null);
    setFileState(null);
    setFileInputKey((k) => k + 1);
  });
  const template = () => run(async () => guardarArchivo(await directoryApi.importTemplate(kind!), PLANTILLAS[kind!]));

  return {
    kind, setKind, file, fileInputKey, setFile: (f: File | null) => clear({ file: f }),
    plan, outcome, working, error, review, confirm, template,
    canConfirm: plan !== null && plan.canConfirm && plan.toCreate > 0,
    avisoSinGuardar: guard.dialog,
  };
}
