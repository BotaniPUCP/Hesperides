import type { SpecimenDetail } from '@shared/types';

/**
 * Medidas del ejemplar con su procedencia (C-08). La altura decide quién poda:
 * una medida que nadie tomó se dice «sin medir», nunca se estima en silencio.
 */

const SOURCE_LABEL: Record<SpecimenDetail['dataSource'], string> = {
  MEASURED: 'Medido en campo',
  GENERIC: 'Estimado por especie',
  UNKNOWN: 'Sin medir',
};

function value(n: number | null, unit: string): string {
  return n === null ? '—' : `${n.toLocaleString('es-PE')} ${unit}`;
}

export function SpecimenMeasures({ specimen }: { specimen: SpecimenDetail }) {
  const measured = specimen.dataSource !== 'UNKNOWN';
  const rows: [string, string][] = [
    ['Altura', value(specimen.heightM, 'm')],
    ['Altura del fuste', value(specimen.trunkHeightM, 'm')],
    ['DAP', value(specimen.dbhCm, 'cm')],
    ['Radio de copa', value(specimen.crownRadiusM, 'm')],
  ];
  if (specimen.isBanded !== null) rows.push(['Zunchado', specimen.isBanded ? 'Sí' : 'No']);

  return (
    <section aria-label="Medidas" className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 sm:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Medidas</p>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            specimen.dataSource === 'MEASURED' ? 'bg-brand-50 text-brand-800' : 'bg-neutral-200 text-neutral-600'
          }`}
        >
          {SOURCE_LABEL[specimen.dataSource]}
        </span>
      </div>
      {measured ? (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([label, v]) => (
            <div key={label}>
              <dt className="text-xs text-neutral-500">{label}</dt>
              <dd className="font-semibold text-neutral-900">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-neutral-600">
          Nadie ha medido este ejemplar todavía. Su altura debe verificarse en campo antes de decidir quién lo poda.
        </p>
      )}
    </section>
  );
}
