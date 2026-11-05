'use client';

import type { IncidentMatrix, IncidentMatrixOptions, IncidentMatrixReview, IncidentOption } from '@shared/types';
import { Input, Select, Textarea } from '@/components/ui';

export function matrixReview(matrix: IncidentMatrix): IncidentMatrixReview {
  return {
    serviceCode: matrix.service?.code ?? null, companyCode: matrix.company?.code ?? null,
    processCode: matrix.process?.code ?? null, subprocessCode: matrix.subprocess?.code ?? null,
    severityCode: matrix.severity?.code ?? null, impactCodes: matrix.impacts.map((i) => i.code),
    responsibleUserId: matrix.responsible?.id ?? null, immediateAction: matrix.immediateAction,
    rootCauseCode: matrix.rootCauseItem?.code ?? null, rootCause: matrix.rootCause,
    preventiveAction: matrix.preventiveAction, impactedProcess: matrix.impactedProcess, observations: matrix.observations,
  };
}

export function IncidentMatrixFields({ value, original, options, disabled, onChange }: {
  value: IncidentMatrixReview; original: IncidentMatrix; options: IncidentMatrixOptions;
  disabled: boolean; onChange: (value: IncidentMatrixReview) => void;
}) {
  const change = <K extends keyof IncidentMatrixReview>(key: K, next: IncidentMatrixReview[K]) => onChange({ ...value, [key]: next });
  const select = (key: 'serviceCode' | 'companyCode' | 'processCode' | 'subprocessCode' | 'severityCode' | 'rootCauseCode', label: string,
    choices: IncidentOption[], previous: IncidentOption | null) => {
    const available = previous && !choices.some((i) => i.code === previous.code) ? [...choices, previous] : choices;
    return <Select id={`matrix-${key}`} label={label} size="lg" clearable disabled={disabled}
      value={value[key]} options={available} placeholder="Sin determinar"
      onChange={(item) => {
        if (key === 'processCode') onChange({ ...value, processCode: item?.code ?? null, subprocessCode: null });
        else change(key, item?.code ?? null);
      }} />;
  };
  const cause = options.rootCauses.find((i) => i.code === value.rootCauseCode);
  return <div className="space-y-5 border-t border-neutral-200 pt-5">
    <section className="space-y-4" aria-labelledby="matrix-classification">
      <h2 id="matrix-classification" className="text-lg font-semibold">Clasificación OSG</h2>
      <p className="text-sm text-neutral-700">{original.event?.label ?? 'Incidencia'} · {original.serviceGroup?.label ?? 'Áreas verdes'}. Los datos aún desconocidos pueden quedar sin determinar.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {select('serviceCode', 'Servicio', options.services, original.service)}
        {select('companyCode', 'Empresa', options.companies, original.company)}
        {select('processCode', 'Proceso N2', options.processes, original.process)}
        {select('subprocessCode', 'Subproceso', options.subprocesses.filter((s) => s.parentCode === value.processCode),
          original.process?.code === value.processCode ? original.subprocess : null)}
        {select('severityCode', 'Severidad', options.severities, original.severity)}
        <Select id="matrix-responsible" label="Responsable de atención" size="lg" clearable disabled={disabled}
          helperText="Responsable de seguimiento. La cuadrilla asignada determina quién puede ejecutar la atención."
          value={value.responsibleUserId?.toString() ?? null} placeholder="Sin asignar"
          options={[...options.responsiblePeople, ...(original.responsible && !options.responsiblePeople.some((p) => p.id === original.responsible?.id) ? [original.responsible] : [])]
            .map((p) => ({ id: p.id, code: String(p.id), label: p.fullName }))}
          onChange={(p) => change('responsibleUserId', p ? Number(p.code) : null)} />
      </div>
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-sm font-medium text-neutral-700">Impacto (puedes seleccionar varios)</legend>
        <div className="grid gap-2 sm:grid-cols-2">{[...options.impacts, ...original.impacts.filter((i) => !options.impacts.some((o) => o.code === i.code))].map((impact) =>
          <label key={impact.code} className="flex min-h-12 items-center gap-3 rounded-md border border-neutral-200 px-3 text-sm">
            <input type="checkbox" checked={value.impactCodes.includes(impact.code)} onChange={(e) => change('impactCodes', e.target.checked
              ? [...value.impactCodes, impact.code] : value.impactCodes.filter((c) => c !== impact.code))} />{impact.label}
          </label>)}</div>
      </fieldset>
    </section>
    <section className="space-y-4" aria-labelledby="matrix-analysis">
      <h2 id="matrix-analysis" className="text-lg font-semibold">Respuesta y análisis</h2>
      <Textarea id="matrix-immediate" label="Acción inmediata / corrección" value={value.immediateAction ?? ''} disabled={disabled} maxLength={10000}
        onChange={(v) => change('immediateAction', v)} helperText="Describir no acredita ejecución. Registra y completa las acciones requeridas en Intervenciones vinculadas." />
      {select('rootCauseCode', 'Causa raíz catalogada', options.rootCauses, original.rootCauseItem)}
      {cause?.description && <p className="text-sm text-neutral-700">{cause.description}</p>}
      <Textarea id="matrix-cause" label="Causa raíz detallada" value={value.rootCause ?? ''} disabled={disabled} maxLength={10000}
        onChange={(v) => change('rootCause', v)} helperText="Se confirma mediante análisis; no se deduce automáticamente del reporte." />
      <Textarea id="matrix-preventive" label="Acción preventiva / oportunidad de mejora" value={value.preventiveAction ?? ''} disabled={disabled} maxLength={10000}
        onChange={(v) => change('preventiveAction', v)} helperText="Si se declara una acción preventiva, debe registrarse y completarse trabajo de prevención antes del cierre." />
      <Input id="matrix-impacted" label="Proceso impactado para mejora" size="lg" value={value.impactedProcess ?? ''} disabled={disabled} maxLength={1000}
        onChange={(v) => change('impactedProcess', v)} />
      <Textarea id="matrix-observations" label="Observaciones" value={value.observations ?? ''} disabled={disabled} maxLength={10000}
        onChange={(v) => change('observations', v)} />
    </section>
  </div>;
}

export function IncidentMatrixSummary({ matrix }: { matrix: IncidentMatrix }) {
  const fields: [string, string | null | undefined][] = [
    ['Servicio', matrix.service?.label], ['Empresa', matrix.company?.label], ['Proceso N2', matrix.process?.label],
    ['Subproceso', matrix.subprocess?.label], ['Severidad', matrix.severity?.label],
    ['Impactos', matrix.impacts.map((i) => i.label).join(', ')], ['Responsable', matrix.responsible?.fullName],
    ['Acción inmediata / corrección', matrix.immediateAction], ['Causa raíz catalogada', matrix.rootCauseItem?.label],
    ['Causa raíz detallada', matrix.rootCause], ['Prevención / mejora', matrix.preventiveAction],
    ['Proceso impactado', matrix.impactedProcess], ['Observaciones', matrix.observations],
  ];
  return <dl className="space-y-3 text-sm">{fields.map(([label, value]) => <div key={label}>
    <dt className="font-medium text-neutral-700">{label}</dt><dd className="whitespace-pre-wrap break-words">{value || 'Sin determinar'}</dd>
  </div>)}</dl>;
}
