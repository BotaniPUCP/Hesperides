'use client';

import type { DirectoryImportKind, DirectoryImportOutcome } from '@shared/types';
import { Button, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layouts/PageHeader';
import { useCanMaintainDirectory } from '@/hooks/useDirectory';
import { EstandarDelDirectorio } from './EstandarDelDirectorio';
import { ImportPreview } from './ImportPreview';
import { MissingOrganizations } from './MissingOrganizations';
import { useRegistroMasivo } from './useRegistroMasivo';

const KINDS: { kind: DirectoryImportKind; title: string; description: string }[] = [
  { kind: 'organizations', title: 'Organizaciones', description: 'Columnas: nombre, tipo, RUC, teléfono y otros nombres.' },
  { kind: 'contacts', title: 'Contactos', description: 'Columnas: nombre, organizaciones, anexo, celular y correo. Carga antes sus organizaciones.' },
];

function Resultado({ outcome }: { outcome: DirectoryImportOutcome }) {
  return (
    <div className="space-y-3">
      <p role="status" className="rounded-md bg-alert-success-bg p-3 text-sm text-alert-success-fg">
        Listo. Se registraron {outcome.created}; {outcome.skipped} ya existían
        {outcome.omitted > 0 && ` y ${outcome.omitted} se omitieron por organización faltante`}.
      </p>
      <MissingOrganizations missing={outcome.missingOrganizations}
        note="Registra esas organizaciones y vuelve a subir sus filas." />
    </div>
  );
}

/**
 * Registro masivo por CSV (SPEC-106 §4.2) en el ciclo común de cargas: se revisa
 * el archivo, el servidor guarda la revisión y se confirma lo revisado. Es todo o nada.
 */
export function RegistroMasivoScreen() {
  const canMaintain = useCanMaintainDirectory();
  const imp = useRegistroMasivo();

  if (!canMaintain) {
    return (
      <div className="surface-card">
        <EmptyState title="Registro masivo" description="Solo coordinación registra organizaciones y contactos." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Registro masivo"
        description="Sube un CSV con muchas organizaciones o contactos. Primero se revisa; si una fila tiene error, no se guarda ninguna." />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Qué registrar</legend>
        {KINDS.map((k) => (
          <label key={k.kind} className={`surface-card flex cursor-pointer items-start gap-3 ${imp.kind === k.kind
            ? 'ring-2 ring-forest-700' : ''}`}>
            <input type="radio" name="import-kind" className="mt-1" checked={imp.kind === k.kind}
              onChange={() => imp.setKind(k.kind)} />
            <span>
              <span className="block font-semibold text-neutral-900">{k.title}</span>
              <span className="block text-sm text-neutral-600">{k.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {imp.kind && (
        <section className="surface-card space-y-4" aria-label="Archivo">
          <EstandarDelDirectorio kind={imp.kind} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-neutral-900">
              Archivo CSV
              <input key={imp.fileInputKey} type="file" accept=".csv,text/csv"
                className="mt-1 block text-sm" onChange={(e) => imp.setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Button variant="secondary" onClick={imp.template} disabled={imp.working}>Descargar plantilla</Button>
            <Button onClick={imp.review} disabled={!imp.file} loading={imp.working && imp.plan === null}>Revisar archivo</Button>
          </div>
          {imp.error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{imp.error}</p>}
          {imp.outcome && <Resultado outcome={imp.outcome} />}
          {imp.plan && (
            <>
              <ImportPreview plan={imp.plan} />
              <div className="flex justify-end">
                <Button onClick={imp.confirm} loading={imp.working} disabled={!imp.canConfirm}>Confirmar registro</Button>
              </div>
            </>
          )}
        </section>
      )}
      {imp.avisoSinGuardar}
    </div>
  );
}
