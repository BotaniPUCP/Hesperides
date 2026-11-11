'use client';

import { format, parseISO } from 'date-fns';
import type { GreenAreaSetSummary, MaintenanceFrequency } from '@shared/types';
import { Badge, DataTable, type DataTableColumn } from '@/components/ui';
import { FrequencyParameters, scopeLabel } from './FrequencyParameters';
import { FrequencyRuleTag } from './FrequencyRuleTag';

interface Props {
  frequencies: MaintenanceFrequency[];
  sets: GreenAreaSetSummary[];
  canManage: boolean;
  /** Abrir una frecuencia para editarla o desactivarla. */
  onEdit: (f: MaintenanceFrequency) => void;
}

const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

function ScopeCell({ frequency: f, sets }: { frequency: MaintenanceFrequency; sets: GreenAreaSetSummary[] }) {
  if (f.scope !== 'BY_SET' || f.greenAreaSetId == null) return <>{scopeLabel(f.scope)}</>;
  return (
    <>
      <span className="block font-medium text-neutral-800">
        {sets.find((s) => s.id === f.greenAreaSetId)?.name ?? `Conjunto ${f.greenAreaSetId}`}
      </span>
      {/* SPEC-203 §5.3: el único lugar donde se dice que el cada cuánto no es el general. */}
      <span className="block text-xs text-neutral-500">propio de este conjunto</span>
    </>
  );
}

/**
 * Las frecuencias vigentes con la tabla estándar. Como en el Directorio, la fila
 * se abre con un clic; editar y desactivar están dentro, así la tabla no
 * necesita una columna de botones que la obliga a desplazarse de lado.
 */
export function FrequenciesTable({ frequencies, sets, canManage, onEdit }: Props) {
  const columns: DataTableColumn<MaintenanceFrequency>[] = [
    {
      key: 'activity', header: 'Actividad',
      render: (f) => (
        <>
          {canManage ? (
            // El clic en la fila no llega por teclado: el nombre es el botón accesible.
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(f); }}
              className="text-left font-medium text-neutral-900 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600">
              {f.activityType.label}
            </button>
          ) : <span className="font-medium text-neutral-900">{f.activityType.label}</span>}
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
      key: 'frequency', header: 'Frecuencia',
      render: (f) => (
        // El dato que se busca es «cada cuánto»; el tipo y la duración lo acompañan en pequeño.
        <span className="flex flex-col items-start gap-0.5">
          <FrequencyParameters frequency={f} />
          <FrequencyRuleTag ruleCode={f.frequencyRuleType.code} label={f.frequencyRuleType.label} />
          {f.estimatedDurationDays != null && (
            <span className="text-xs text-neutral-500">Dura {days(f.estimatedDurationDays)}</span>
          )}
        </span>
      ),
    },
    { key: 'scope', header: 'Se aplica a', render: (f) => <ScopeCell frequency={f} sets={sets} /> },
    // Desde cuándo rige esta versión: sin eso el historial existiría en la base pero no se vería.
    {
      key: 'validFrom', header: 'Vigente desde', hideOnMobile: true, className: 'whitespace-nowrap',
      render: (f) => format(parseISO(f.validFrom), 'dd/MM/yyyy'),
    },
  ];

  return (
    <DataTable columns={columns} rows={frequencies} rowKey={(f) => f.id}
      totalElements={frequencies.length} page={0} pageSize={Math.max(frequencies.length, 1)}
      onPageChange={() => undefined} onRowClick={canManage ? onEdit : undefined} />
  );
}
