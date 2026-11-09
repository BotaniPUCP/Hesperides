'use client';

import type { DirectoryImportPlan, ImportPlannedRow, ImportRowAction } from '@shared/types';
import { CopiarErrores } from '@/components/importar/CopiarErrores';
import { issueMessage } from '@/lib/directoryImportMessages';
import { MissingOrganizations } from './MissingOrganizations';

const ACTIONS: Record<ImportRowAction, { label: string; className: string }> = {
  CREATE: { label: 'Se crea', className: 'bg-alert-success-bg text-alert-success-fg' },
  SKIP: { label: 'Ya existe, se omite', className: 'bg-neutral-100 text-neutral-700' },
  OMIT: { label: 'Se omite: falta su organización', className: 'bg-urgency-medium-bg text-urgency-medium-fg' },
  ERROR: { label: 'Error', className: 'bg-alert-danger-bg text-alert-danger-fg' },
};

function reasons(row: ImportPlannedRow): string[] {
  return [...row.issues.map(issueMessage), ...row.missing.map((name) => `«${name}» no está en el Directorio.`)];
}

function summary(plan: DirectoryImportPlan): string {
  const parts = [`${plan.toCreate} por crear`, `${plan.toSkip} ya existen`];
  if (plan.toOmit > 0) parts.push(`${plan.toOmit} se omiten por organización faltante`);
  parts.push(`${plan.errors} con error`);
  return parts.join(' · ');
}

/** Qué pasará con cada fila del archivo, con los motivos de las que no entran. */
export function ImportPreview({ plan }: { plan: DirectoryImportPlan }) {
  const issues = plan.rows.flatMap((r) => r.issues.map((i) => ({ ...i, mensaje: issueMessage(i) })));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-700" role="status">{summary(plan)}</p>
        {issues.length > 0 && <CopiarErrores errores={issues} />}
      </div>
      <MissingOrganizations missing={plan.missingOrganizations}
        note="Esas filas no se cargarán. Registra la organización y vuelve a subir el archivo para incluirlas." />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-600">
            <tr>
              <th className="py-2 pr-3 font-medium">Fila</th>
              <th className="py-2 pr-3 font-medium">Nombre</th>
              <th className="py-2 pr-3 font-medium">Resultado</th>
              <th className="py-2 font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {plan.rows.map((row) => (
              <tr key={row.line} className="align-top">
                <td className="py-2 pr-3 text-neutral-600">{row.line}</td>
                <td className="py-2 pr-3 text-neutral-900">{row.name ?? '—'}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTIONS[row.action].className}`}>
                    {ACTIONS[row.action].label}
                  </span>
                </td>
                <td className="py-2 text-neutral-800">
                  {reasons(row).length > 0 && (
                    <ul className="space-y-0.5">
                      {reasons(row).map((reason, i) => <li key={i}>{reason}</li>)}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
