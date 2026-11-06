'use client';

import { useState } from 'react';
import type { IncidentDistribution, IncidentMatrixSummary } from '@shared/types';
import { Button, Card } from '@/components/ui';
import { incidentsApi } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';

function Distribution({ title, rows }: { title: string; rows: IncidentDistribution[] }) {
  const max=Math.max(1,...rows.map(r => r.count));
  return <Card title={title}>{rows.length ? <ul className="space-y-3 text-sm">{rows.slice(0,8).map((row) =>
    <li key={row.label} className="space-y-1"><div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words">{row.label}</span>
      <span className="font-semibold tabular-nums">{row.count}</span></div>
      <meter min={0} max={max} value={row.count} aria-label={`${title}: ${row.label}`} className="h-3 w-full accent-brand-600">{row.count}</meter>
    </li>)}</ul> : <p className="text-sm text-neutral-700">Sin datos.</p>}</Card>;
}

export function IncidentExportButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="space-y-2">
    <Button size="lg" variant="secondary" loading={busy} onClick={async () => {
      setBusy(true); setError('');
      try {
        const file = await incidentsApi.export();
        const url = URL.createObjectURL(new Blob([file.content], { type: file.contentType }));
        const link = document.createElement('a');
        link.href = url; link.download = file.filename; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      } catch (ex) { setError(mensajeDeApiError(ex)); }
      finally { setBusy(false); }
    }}>Exportar matriz OSG</Button>
    <p className="surface-pill text-xs text-neutral-700">CSV de registros aprobados: 23 columnas, independiente de los filtros.</p>
    {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
  </div>;
}

export function IncidentDashboard({ matrix }: { matrix: IncidentMatrixSummary }) {
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <Card><p className="text-sm text-neutral-700">Acciones requeridas pendientes</p><p className="mt-2 text-3xl font-semibold">{matrix.pendingActions}</p></Card>
      <Card><p className="text-sm text-neutral-700">Promedio de cierre · días hábiles inclusivos</p>
        <p className="mt-2 text-3xl font-semibold">{matrix.averageClosureBusinessDays === null ? '—' : matrix.averageClosureBusinessDays.toLocaleString('es-PE', { maximumFractionDigits: 1 })}</p>
        <p className="text-xs text-neutral-700">Solo casos cerrados ({matrix.closedWithDuration}). No es un indicador de SLA.</p></Card>
    </div>
    <p className="text-sm text-neutral-700">Distribuciones de todos los reportes recibidos, incluidos los pendientes de registro. Un caso puede tener varios impactos. Urgencia, sector y carga por responsable incluyen solo casos activos; se muestran hasta ocho grupos por gráfico.</p>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Distribution title="Por severidad" rows={matrix.severities} />
      <Distribution title="Por impacto" rows={matrix.impacts} />
      <Distribution title="Por servicio" rows={matrix.services} />
      <Distribution title="Carga por responsable" rows={matrix.responsiblePeople} />
      <Distribution title="Activas por urgencia" rows={matrix.urgencies} />
      <Distribution title="Por estado" rows={matrix.states} />
      <Distribution title="Por causa raíz catalogada" rows={matrix.rootCauses} />
      <Distribution title="Empresa de atención" rows={matrix.companies} />
      <Distribution title="Activas por sector" rows={matrix.sectors} />
      <Distribution title="Secciones con más reportes" rows={matrix.locations} />
      <Distribution title="Por tipo de evento" rows={matrix.events} />
      <Distribution title="Por canal de ingreso" rows={matrix.channels} />
    </div>
  </div>;
}
