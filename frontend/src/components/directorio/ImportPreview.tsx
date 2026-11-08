'use client';

import type { DirectoryImportPlan, ImportRowAction } from '@shared/types';
import { issueMessage } from '@/lib/directoryImportMessages';

const ACTIONS: Record<ImportRowAction, { label: string; className: string }> = {
  CREATE: { label: 'Se crea', className: 'bg-alert-success-bg text-alert-success-fg' },
  SKIP: { label: 'Ya existe, se omite', className: 'bg-neutral-100 text-neutral-700' },
  ERROR: { label: 'Error', className: 'bg-alert-danger-bg text-alert-danger-fg' },
};

/** Qué pasará con cada fila del archivo, con los motivos de las que no se pueden crear. */
export function ImportPreview({ plan }: { plan: DirectoryImportPlan }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-700" role="status">
        {plan.creates} por crear · {plan.skips} ya existen · {plan.errors} con error
      </p>
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
                  {row.issues.length > 0 && (
                    <ul className="space-y-0.5">
                      {row.issues.map((issue, i) => <li key={i}>{issueMessage(issue)}</li>)}
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
