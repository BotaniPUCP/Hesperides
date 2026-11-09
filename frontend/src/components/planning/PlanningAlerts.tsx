'use client';

import Link from 'next/link';
import type { PlanningRow } from '@shared/types';
import { useAuth } from '@/hooks/useAuth';
import { useRequest } from '@/hooks/useRequest';
import { planningApi } from '@/lib/planning-api';
import { NEAR_DUE_DAYS, rowTitle, stateDetail } from './planningTexts';

const PLANNERS = ['ADMIN', 'COORDINADOR'];

const isSoon = (r: PlanningRow) => r.state === 'DUE' || (r.state === 'NOT_DUE' && r.days !== null && r.days <= NEAR_DUE_DAYS);

/** «… — 2 días tarde»: el detalle del estado sin sus paréntesis. */
const line = (r: PlanningRow) => `${rowTitle(r)} — ${stateDetail(r).replace(/^\(|\)$/g, '')}`;

function Block({ title, rows, tone }: { title: string; rows: PlanningRow[]; tone: string }) {
  return (
    <section className={`rounded-md border-l-4 p-3 text-sm ${tone}`}>
      <p className="font-semibold">{title}</p>
      <ul>{rows.map((r) => <li key={`${r.setId}:${r.activityTypeItemId}`}>{line(r)}</li>)}</ul>
    </section>
  );
}

/** Avisos del inicio (SPEC-203 §5.7): cuentan filas, no conjuntos únicos. Solo para quien planifica. */
export function PlanningAlerts() {
  const { user } = useAuth();
  const plans = PLANNERS.includes(user?.role.code ?? '');
  const planning = useRequest(plans ? 'home-planning' : null, () => planningApi.rows());
  if (!plans || !planning.data) return null;

  const overdue = planning.data.filter((r) => r.state === 'OVERDUE');
  const soon = planning.data.filter(isSoon);
  if (overdue.length === 0 && soon.length === 0) return <span data-testid="planning-alerts-ready" hidden />;
  return (
    <div className="space-y-3">
      {overdue.length > 0 && (
        <Block title={overdue.length === 1 ? '1 conjunto atrasado' : `${overdue.length} conjuntos atrasados`}
          rows={overdue} tone="border-action-danger bg-alert-danger-bg text-alert-danger-fg" />
      )}
      {soon.length > 0 && (
        <Block title={soon.length === 1 ? `1 conjunto toca en los próximos ${NEAR_DUE_DAYS} días`
          : `${soon.length} conjuntos tocan en los próximos ${NEAR_DUE_DAYS} días`}
          rows={soon} tone="border-alert-warning-border bg-alert-warning-bg text-alert-warning-fg" />
      )}
      <Link href="/intervenciones/planificacion" className="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
        Ir a Planificación
      </Link>
    </div>
  );
}
