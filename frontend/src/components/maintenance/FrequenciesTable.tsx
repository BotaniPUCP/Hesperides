'use client';

import type { GreenAreaSetSummary, MaintenanceFrequency } from '@shared/types';
import { Badge, Button, DataTable, type DataTableColumn } from '@/components/ui';
import { FrequencyParameters, scopeLabel } from './FrequencyParameters';
import { FrequencyRuleBadge } from './FrequencyRuleBadge';

interface Props {
  frequencies: MaintenanceFrequency[];
  sets: GreenAreaSetSummary[];
  canManage: boolean;
  onEdit: (f: MaintenanceFrequency) => void;
  onDeactivate: (id: number) => void;
}

function ScopeCell({ frequency: f, sets }: { frequency: MaintenanceFrequency; sets: GreenAreaSetSummary[] }) {
  if (f.scope !== 'BY_SET' || f.greenAreaSetId == null) return <>{scopeLabel(f.scope)}</>;
  return (
    <>
      <span className="block font-medium text-neutral-800">
        {sets.find((s) => s.id === f.greenAreaSetId)?.name ?? `Conjunto ${f.greenAreaSetId}`}
      </span>
      {/* SPEC-203 §5.3: el único lugar donde se dice que el cada cuánto no es el general. */}
      <span className="block text-xs text-neutral-600">propio de este conjunto</span>
    </>
  );
}

/** Las frecuencias vigentes, con la tabla estándar de la aplicación (tarjetas en móvil). */
export function FrequenciesTable({ frequencies, sets, canManage, onEdit, onDeactivate }: Props) {
  const columns: DataTableColumn<MaintenanceFrequency>[] = [
    {
      key: 'activity', header: 'Actividad',
      render: (f) => (
        <>
          <span className="block font-medium text-neutral-900">{f.activityType.label}</span>
          {f.notes && <span className="block max-w-xs truncate text-xs text-neutral-500" title={f.notes}>{f.notes}</span>}
        </>
      ),
    },
    {
      key: 'regime', header: 'Quién la ejecuta',
      render: (f) => f.regime === 'OUTSOURCED'
        ? <Badge label="Tercerizado" color="info" />
        : <Badge label="Personal propio" color="brand" />,
    },
    {
      key: 'rule', header: 'Tipo de frecuencia',
      render: (f) => <FrequencyRuleBadge ruleCode={f.frequencyRuleType.code} label={f.frequencyRuleType.label} />,
    },
    { key: 'parameters', header: 'Cada cuánto', render: (f) => <FrequencyParameters frequency={f} /> },
    {
      key: 'duration', header: 'Duración estimada', hideOnMobile: true,
      render: (f) => (f.estimatedDurationDays ? `${f.estimatedDurationDays} días` : '—'),
    },
    { key: 'scope', header: 'Se aplica a', render: (f) => <ScopeCell frequency={f} sets={sets} /> },
    // Desde cuándo rige esta versión: sin eso el historial existiría en la base pero no se vería.
    { key: 'validFrom', header: 'Vigente desde', hideOnMobile: true, render: (f) => f.validFrom },
  ];
  if (canManage) {
    columns.push({
      key: 'actions', header: 'Acciones', headerClassName: 'text-right', className: 'whitespace-nowrap text-right',
      render: (f) => (
        <span className="inline-flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit(f)}>Editar</Button>
          <Button variant="danger" size="sm" onClick={() => onDeactivate(f.id)}>Desactivar</Button>
        </span>
      ),
    });
  }

  return (
    <DataTable columns={columns} rows={frequencies} rowKey={(f) => f.id}
      totalElements={frequencies.length} page={0} pageSize={Math.max(frequencies.length, 1)}
      onPageChange={() => undefined} />
  );
}
