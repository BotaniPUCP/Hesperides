'use client';

import { useState } from 'react';
import type { DirectoryImportKind, DirectoryImportOutcome, DirectoryImportPlan } from '@shared/types';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { mensajeDeApiError } from '@/lib/api-errors';
import { detectarTipoDeImportacion, TipoNoReconocidoError } from '@/lib/directoryImportKind';
import { directoryApi } from '@/lib/directory-api';
import { guardarArchivo } from '@/lib/download';

/** Los nombres de las plantillas: los mismos de `backend/src/main/resources/imports/templates/`. */
const PLANTILLAS: Record<DirectoryImportKind, string> = {
  organizations: 'organizaciones.csv',
  contacts: 'contactos.csv',
};

function mensajeDeError(e: unknown): string {
  return e instanceof TipoNoReconocidoError ? e.message : mensajeDeApiError(e);
}

/**
 * El registro masivo en el ciclo común de cargas: subir el archivo reconoce su
 * tipo por la cabecera y lo revisa, lo que abre un lote en el servidor; la
 * confirmación escribe lo revisado sin volver a subir el archivo.
 */
export function useRegistroMasivo() {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<DirectoryImportKind | null>(null);
  const [plan, setPlan] = useState<DirectoryImportPlan | null>(null);
  const [outcome, setOutcome] = useState<DirectoryImportOutcome | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cambia para vaciar el campo de archivo: así el mismo archivo se puede volver a elegir.
  const [fileInputKey, setFileInputKey] = useState(0);
  // Una revisión sin confirmar es trabajo que se pierde al salir o al subir otro archivo.
  const guard = useUnsavedChangesGuard(plan !== null);

  async function run(step: () => Promise<void>) {
    setWorking(true);
    setError(null);
    try {
      await step();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setWorking(false);
    }
  }

  function reviewFile(next: File) {
    setFile(next);
    setKind(null);
    setPlan(null);
    setOutcome(null);
    return run(async () => {
      const detected = await detectarTipoDeImportacion(next);
      setKind(detected);
      setPlan(await directoryApi.previewImport(detected, next));
    });
  }

  /** Subir otro archivo descarta la revisión pendiente, avisando antes. */
  function upload(next: File | null) {
    setFileInputKey((k) => k + 1);
    if (next) guard.confirm(() => void reviewFile(next));
  }

  const confirm = () => run(async () => {
    setOutcome(await directoryApi.confirmImport(plan!.batchId));
    setPlan(null);
  });
  const template = (of: DirectoryImportKind) =>
    run(async () => guardarArchivo(await directoryApi.importTemplate(of), PLANTILLAS[of]));

  return {
    file, kind, fileInputKey, upload, plan, outcome, working, error, confirm, template,
    hasErrors: plan !== null && !plan.canConfirm,
    canConfirm: plan !== null && plan.canConfirm && plan.toCreate > 0,
    avisoSinGuardar: guard.dialog,
  };
}
