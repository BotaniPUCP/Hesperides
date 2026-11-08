'use client';

import { useState } from 'react';
import type { DirectoryImportKind, DirectoryImportOutcome, DirectoryImportPlan } from '@shared/types';
import { Button, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layouts/PageHeader';
import { useCanMaintainDirectory } from '@/hooks/useDirectory';
import { mensajeDeApiError } from '@/lib/api-errors';
import { directoryApi } from '@/lib/directory-api';
import { guardarArchivo } from '@/lib/download';
import { ImportPreview } from './ImportPreview';

const KINDS: { kind: DirectoryImportKind; title: string; description: string }[] = [
  { kind: 'organizaciones', title: 'Organizaciones', description: 'Columnas: nombre, tipo, RUC, teléfono y otros nombres.' },
  { kind: 'contactos', title: 'Contactos', description: 'Columnas: nombre, organizaciones, anexo, celular y correo. Carga antes sus organizaciones.' },
];

/**
 * Registro masivo por CSV (SPEC-106): se revisa el archivo antes de guardar y es
 * todo o nada. Separador «;» y listas con «|», como en la plantilla.
 */
export function RegistroMasivoScreen() {
  const canMaintain = useCanMaintainDirectory();
  const [kind, setKind] = useState<DirectoryImportKind | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<DirectoryImportPlan | null>(null);
  const [outcome, setOutcome] = useState<DirectoryImportOutcome | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canMaintain) {
    return <EmptyState title="Registro masivo" description="Solo coordinación registra organizaciones y contactos." />;
  }

  function reset(next: { kind?: DirectoryImportKind; file?: File | null }) {
    if (next.kind) setKind(next.kind);
    if (next.file !== undefined) setFile(next.file);
    setPlan(null);
    setOutcome(null);
    setError(null);
  }

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

  const review = () => run(async () => setPlan(await directoryApi.previewImport(kind!, file!)));
  const confirm = () => run(async () => {
    setOutcome(await directoryApi.confirmImport(kind!, file!));
    setPlan(null);
  });
  const template = () => run(async () => guardarArchivo(await directoryApi.importTemplate(kind!), `directorio-${kind}.csv`));

  return (
    <div className="space-y-6">
      <PageHeader title="Registro masivo"
        description="Sube un CSV con muchas organizaciones o contactos. Primero se revisa; si una fila tiene error, no se guarda ninguna." />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Qué registrar</legend>
        {KINDS.map((k) => (
          <label key={k.kind} className={`surface-card flex cursor-pointer items-start gap-3 ${kind === k.kind
            ? 'ring-2 ring-forest-700' : ''}`}>
            <input type="radio" name="import-kind" className="mt-1" checked={kind === k.kind}
              onChange={() => reset({ kind: k.kind })} />
            <span>
              <span className="block font-semibold text-neutral-900">{k.title}</span>
              <span className="block text-sm text-neutral-600">{k.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {kind && (
        <section className="surface-card space-y-4" aria-label="Archivo">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-neutral-900">
              Archivo CSV
              <input type="file" accept=".csv,text/csv" className="mt-1 block text-sm"
                onChange={(e) => reset({ file: e.target.files?.[0] ?? null })} />
            </label>
            <Button variant="secondary" onClick={template} disabled={working}>Descargar plantilla</Button>
            <Button onClick={review} disabled={!file} loading={working && plan === null}>Revisar archivo</Button>
          </div>
          {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
          {outcome && (
            <p role="status" className="rounded-md bg-alert-success-bg p-3 text-sm text-alert-success-fg">
              Listo. Se registraron {outcome.created} y se omitieron {outcome.skipped} que ya existían.
            </p>
          )}
          {plan && (
            <>
              <ImportPreview plan={plan} />
              <div className="flex justify-end">
                <Button onClick={confirm} loading={working} disabled={plan.errors > 0 || plan.creates === 0}>
                  Confirmar registro
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
