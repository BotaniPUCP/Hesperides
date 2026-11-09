'use client';

import type { ReactNode } from 'react';
import { BackButton, EmptyState, LoadingSkeleton } from '@/components/ui';
import { PageHeader } from '@/components/layouts/PageHeader';

/** Un dato de una ficha; vacío se muestra como raya para no dejar un hueco que parezca un error. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-neutral-600">{label}</dt>
      <dd className="text-neutral-900">{children ?? '—'}</dd>
    </div>
  );
}

/** Lo común a las dos fichas: volver, cargando, no encontrado y error. */
export function DetailFrame({ loading, notFound, errorMessage, children }:
  { loading: boolean; notFound: boolean; errorMessage: string | null; children: () => ReactNode }) {
  if (notFound) {
    return (
      <div className="surface-card">
        <EmptyState title="No se encontró en el directorio" description="Revisa el código o vuelve al directorio." />
      </div>
    );
  }
  if (errorMessage) {
    return <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{errorMessage}</p>;
  }
  if (loading) return <LoadingSkeleton variant="card" />;
  return <>{children()}</>;
}

export function DetailHeader({ title, badge, description, actions }:
  { title: string; badge?: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <BackButton fallbackHref="/directorio" />
      <div className="flex-1">
        <PageHeader title={<span className="flex flex-wrap items-center gap-2">{title}{badge}</span>}
          description={description} actions={actions} />
      </div>
    </div>
  );
}

export function InactiveBadge({ label }: { label: string }) {
  return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-sm font-normal text-neutral-700">{label}</span>;
}
