'use client';

import type { ReservationImportPlan, ReservationImportPlannedRow, ReservationImportRowAction } from '@shared/types';
import { CopiarErrores } from '@/components/importar/CopiarErrores';
import { reservationIssueMessage } from '@/lib/reservationImportMessages';

const ACTIONS: Record<ReservationImportRowAction, { label: string; className: string }> = {
  CREATE: { label: 'Se crea', className: 'bg-alert-success-bg text-alert-success-fg' },
  WARNING: { label: 'Se crea con avisos', className: 'bg-alert-warning-bg text-alert-warning-fg' },
  ERROR: { label: 'Error', className: 'bg-alert-danger-bg text-alert-danger-fg' },
};

function reasons(row: ReservationImportPlannedRow): string[] {
  return row.issues.map(reservationIssueMessage);
}

function summary(plan: ReservationImportPlan): string {
  const parts = [`${plan.toCreate} por crear`];
  if (plan.toWarning > 0) parts.push(`${plan.toWarning} con avisos`);
  parts.push(`${plan.errors} con error`);
  return parts.join(' · ');
}

/** Qué pasará con cada fila del archivo, con los motivos de las que no entran. */
export function ReservationImportPreview({ plan }: { plan: ReservationImportPlan }) {
  const issues = plan.rows.flatMap((row) => row.issues.map((issue) => ({
    ...issue, mensaje: reservationIssueMessage(issue),
  })));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-700" role="status">{summary(plan)}</p>
        {issues.length > 0 && <CopiarErrores errores={issues} />}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-600">
            <tr>
              <th className="py-2 pr-3 font-medium">Fila</th>
              <th className="py-2 pr-3 font-medium">Jardín</th>
              <th className="py-2 pr-3 font-medium">Pedido de</th>
              <th className="py-2 pr-3 font-medium">Resultado</th>
              <th className="py-2 font-medium">Motivo o aviso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {plan.rows.map((row) => (
              <tr key={row.line} className="align-top">
                <td className="py-2 pr-3 text-neutral-600">{row.line}</td>
                <td className="py-2 pr-3 text-neutral-900">{row.garden ?? '—'}</td>
                <td className="py-2 pr-3 text-neutral-900">{row.organization ?? '—'}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTIONS[row.action].className}`}>
                    {ACTIONS[row.action].label}
                  </span>
                </td>
                <td className="py-2 text-neutral-800">
                  {reasons(row).length > 0 && (
                    <ul className="space-y-0.5">
                      {reasons(row).map((reason, index) => <li key={index}>{reason}</li>)}
                    </ul>
                  )}
                  {row.warnings.length > 0 && (
                    <ul className="space-y-0.5 text-alert-warning-fg">
                      {row.warnings.map((warning, index) => (
                        <li key={index}>
                          {warning.text}
                          {warning.reservationCode && ` (${warning.reservationCode})`}
                        </li>
                      ))}
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
