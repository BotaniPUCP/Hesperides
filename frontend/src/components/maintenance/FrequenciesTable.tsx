'use client';

import { format, parseISO } from 'date-fns';
import type { MaintenanceFrequency } from '@shared/types';
import { Badge, DataTable, type DataTableColumn } from '@/components/ui';
import { frequencySummary, scopeLabel } from './frequencySummary';
import { FrequencyRuleTag } from './FrequencyRuleTag';

interface Props {
  frequencies: MaintenanceFrequency[];
  canManage: boolean;
  /** Abrir una frecuencia para editarla o desactivarla. */
  onEdit: (f: MaintenanceFrequency) => void;
}

const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

/** Dónde rige. La frecuencia es de su actividad: dónde se usa se ve en Planificación, no aquí. */
function ScopeCell({ frequency: f }: { frequency: MaintenanceFrequency }) {
  return <span className="block text-neutral-800">{scopeLabel(f.scope)}</span>;
}

/**
 * Las frecuencias vigentes con la tabla estándar. Como en el Directorio, la fila
 * se abre con un clic; editar y desactivar están dentro, así la tabla no
 * necesita una columna de botones que la obliga a desplazarse de lado.
 */
export function FrequenciesTable({ frequencies, canManage, onEdit }: Props) {
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
      render: (f) => {
        // Dos niveles: la frase de «cada cuánto» manda; tipo y duración van juntos en una línea menor.
        const { main, detail } = frequencySummary(f);
        return (
          <span className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium text-neutral-900">{main}</span>
            {detail && <span className="text-xs text-neutral-600">{detail}</span>}
            <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-500">
              <FrequencyRuleTag ruleCode={f.frequencyRuleType.code} label={f.frequencyRuleType.label} />
              {f.estimatedDurationDays != null && (
                <><span aria-hidden="true">·</span><span>dura {days(f.estimatedDurationDays)}</span></>
              )}
            </span>
          </span>
        );
      },
    },
    { key: 'scope', header: 'Se aplica a', render: (f) => <ScopeCell frequency={f} /> },
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
