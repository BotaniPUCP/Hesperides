'use client';

import { useRef } from 'react';
import type { DirectoryImportKind, DirectoryImportOutcome } from '@shared/types';
import { Button, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layouts/PageHeader';
import { useCanMaintainDirectory } from '@/hooks/useDirectory';
import { EstandarDelDirectorio } from './EstandarDelDirectorio';
import { ImportPreview } from './ImportPreview';
import { MissingOrganizations } from './MissingOrganizations';
import { useRegistroMasivo } from './useRegistroMasivo';

const TIPOS: { kind: DirectoryImportKind; title: string; plural: string }[] = [
  { kind: 'organizations', title: 'Registro de organizaciones masivas', plural: 'organizaciones' },
  { kind: 'contacts', title: 'Registro de contactos masivos', plural: 'contactos' },
];

const NOMBRE_DEL_TIPO: Record<DirectoryImportKind, string> = { organizations: 'organizaciones', contacts: 'contactos' };

function UploadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4" />
    </svg>
  );
}

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
 * Registro masivo por CSV (SPEC-106 §4.2) en el ciclo común de cargas: se sube
 * el archivo, se reconoce su tipo, el servidor guarda la revisión y se confirma
 * lo revisado. Es todo o nada: con un error no se registra nada.
 */
export function RegistroMasivoScreen() {
  const canMaintain = useCanMaintainDirectory();
  const imp = useRegistroMasivo();
  const fileInput = useRef<HTMLInputElement>(null);

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
      <section className="surface-card space-y-6" aria-label="Archivo">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {TIPOS.map((t) => (
            <div key={t.kind} className="min-w-0 space-y-3">
              <h2 className="font-semibold text-neutral-900">{t.title}</h2>
              <EstandarDelDirectorio kind={t.kind} />
              <Button variant="secondary" size="sm" onClick={() => imp.template(t.kind)} disabled={imp.working}
                aria-label={`Descargar plantilla de ${t.plural}`}>Descargar plantilla</Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4">
          <input key={imp.fileInputKey} ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only"
            aria-label="Archivo CSV" tabIndex={-1} onChange={(e) => imp.upload(e.target.files?.[0] ?? null)} />
          <Button onClick={() => fileInput.current?.click()} loading={imp.working && imp.plan === null}
            leadingIcon={<UploadIcon />}>Subir archivo</Button>
          {imp.file && (
            <span className="text-sm text-neutral-700">
              {imp.file.name}{imp.kind && ` · archivo de ${NOMBRE_DEL_TIPO[imp.kind]}`}
            </span>
          )}
        </div>
        {imp.error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{imp.error}</p>}
        {imp.outcome && <Resultado outcome={imp.outcome} />}
        {imp.plan && (
          <div className="space-y-3">
            <h2 className="font-semibold text-neutral-900">Revisión</h2>
            {imp.hasErrors && (
              <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
                Corrige los errores del archivo para poder subirlo.
              </p>
            )}
            <ImportPreview plan={imp.plan} />
            <div className="flex justify-end">
              <Button onClick={imp.confirm} loading={imp.working} disabled={!imp.canConfirm}>Confirmar registro</Button>
            </div>
          </div>
        )}
      </section>
      {imp.avisoSinGuardar}
    </div>
  );
}
