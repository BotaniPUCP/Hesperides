'use client';

import Link from 'next/link';
import type { IncidentMine } from '@shared/types';
import { Button, Card, LoadingSkeleton } from '@/components/ui';
import { IncidentBadges } from './IncidentBadges';

/** Solo lo que envió la persona, aunque vea más por su cuadrilla (SPEC-201 §3.11). */
export function IncidentMineSummary({ mine, loading, error, onRetry, href }: {
  mine: IncidentMine | null; loading: boolean; error: string | null; onRetry: () => void; href: (path: string) => string;
}) {
  if (loading) return <LoadingSkeleton variant="card" />;
  if (error) return (
    <div role="alert" className="space-y-3 rounded-lg bg-alert-warning-bg p-4 text-alert-warning-fg">
      <p>No se pudieron cargar tus reportes. {error}</p>
      <Button variant="secondary" size="lg" onClick={onRetry}>Reintentar mis reportes</Button>
    </div>
  );
  if (!mine) return null;
  const counts: [string, number][] = [['Enviados', mine.total], ['Por activar', mine.notActive], ['En atención', mine.open], ['Cerrados', mine.closed]];
  return (
    <section aria-label="Mis reportes" className="surface-card space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900">Mis reportes</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{counts.map(([label, count]) => (
        <Card key={label}><dt className="text-sm text-neutral-700">{label}</dt><dd className="mt-1 text-2xl font-semibold text-neutral-900">{count}</dd></Card>
      ))}</dl>
      {mine.recent.length > 0 && <ul className="space-y-2">{mine.recent.slice(0, 3).map((incident) => (
        <li key={incident.id}>
          <Link href={href(`/incidencias/${incident.id}`)} className="block space-y-2 rounded-md border border-neutral-200 p-3 hover:bg-neutral-50">
            <span className="font-medium text-neutral-900">{incident.code}</span>
            <span className="line-clamp-2 block text-sm text-neutral-700">{incident.originalDescription}</span>
            <IncidentBadges incident={incident} />
          </Link>
        </li>
      ))}</ul>}
    </section>
  );
}
