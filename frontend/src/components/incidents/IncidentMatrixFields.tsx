'use client';

import type { IncidentMatrix, IncidentMatrixOptions, IncidentMatrixReview, IncidentOption } from '@shared/types';
import type { ReactNode } from 'react';
import { Input, Select, Textarea } from '@/components/ui';

export const emptyIncidentMatrix: IncidentMatrix = {
  event: null,serviceGroup: null,service: null,company: null,process: null,subprocess: null,severity: null,impacts: [],
  responsible: null,immediateAction: null,rootCauseItem: null,rootCause: null,preventiveAction: null,impactedProcess: null,
  observations: null,intakeChannel: null,reporterName: null,zone: null,
};

export function matrixReview(matrix: IncidentMatrix): IncidentMatrixReview {
  return {
    serviceCode: matrix.service?.code ?? null, companyCode: matrix.company?.code ?? null,
    processCode: matrix.process?.code ?? null, subprocessCode: matrix.subprocess?.code ?? null,
    severityCode: matrix.severity?.code ?? null, impactCodes: matrix.impacts.map((i) => i.code),
    responsibleUserId: matrix.responsible?.id ?? null, immediateAction: matrix.immediateAction,
    rootCauseCode: matrix.rootCauseItem?.code ?? null, rootCause: matrix.rootCause,
    preventiveAction: matrix.preventiveAction, impactedProcess: matrix.impactedProcess, observations: matrix.observations,
    eventCode: matrix.event?.code ?? 'INCIDENT',intakeChannelCode: matrix.intakeChannel?.code ?? 'FORM',
    reporterName: matrix.reporterName,zoneId: matrix.zone?.id ?? null,
  };
}

export function IncidentZoneField({ value, options, disabled, onChange }: {
  value: number | null; options: IncidentMatrixOptions; disabled: boolean; onChange: (value: number | null) => void;
}) {
  return <Select id="matrix-zone" label="Sección del campus (opcional)" size="lg" clearable disabled={disabled} value={value?.toString() ?? null}
    options={options.zones.map(z => ({ id: z.id, code: String(z.id), label: `${z.label}${z.sectorLabel ? ` · ${z.sectorLabel}` : ''}` }))}
    onChange={z => onChange(z?.id ?? null)} />;
}

export function IncidentMatrixFields({ value, original, options, disabled, onChange, priority, management, includeZone = true }: {
  value: IncidentMatrixReview; original: IncidentMatrix; options: IncidentMatrixOptions;
  disabled: boolean; onChange: (value: IncidentMatrixReview) => void;
  priority?: ReactNode; management?: ReactNode; includeZone?: boolean;
}) {
  const change = <K extends keyof IncidentMatrixReview>(key: K, next: IncidentMatrixReview[K]) => onChange({ ...value, [key]: next });
  const select = (key: 'serviceCode' | 'companyCode' | 'processCode' | 'subprocessCode' | 'severityCode' | 'rootCauseCode' | 'eventCode' | 'intakeChannelCode', label: string,
    choices: IncidentOption[], previous: IncidentOption | null) => {
    const available = previous && !choices.some((i) => i.code === previous.code) ? [...choices, previous] : choices;
    return <Select id={`matrix-${key}`} label={label} size="lg" clearable disabled={disabled}
       value={value[key] ?? null} options={available} placeholder="Sin determinar"
      onChange={(item) => {
        if (key === 'processCode') onChange({ ...value, processCode: item?.code ?? null, subprocessCode: null });
        else change(key, item?.code ?? null);
      }} />;
  };
  const cause = options.rootCauses.find((i) => i.code === value.rootCauseCode);
  return <div className="space-y-5 border-t border-neutral-200 pt-5">
    <section className="space-y-4" aria-labelledby="matrix-classification">
      <h2 id="matrix-classification" className="flex items-center gap-3 text-[13px] font-semibold"><span className="grid h-6 w-6 place-content-center rounded-md bg-brand-50 text-[10px] text-brand-800">02</span>Clasificación y prioridad</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>div]:min-w-0 [&_select]:min-w-0 [&_select]:max-w-full">
        {includeZone && <IncidentZoneField value={value.zoneId ?? null} options={options} disabled={disabled} onChange={zoneId => change('zoneId', zoneId)} />}
        {select('serviceCode', 'Servicio', options.services, original.service)}
        {priority}
        {select('severityCode', 'Severidad', options.severities, original.severity)}
      </div>
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-sm font-medium text-neutral-700">Impacto</legend>
        <div className="flex flex-wrap gap-2">{[...options.impacts, ...original.impacts.filter((i) => !options.impacts.some((o) => o.code === i.code))].map((impact) =>
          <label key={impact.code} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-md border border-neutral-300 bg-neutral-0 px-3 text-sm has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-800">
            <input type="checkbox" checked={value.impactCodes.includes(impact.code)} onChange={(e) => change('impactCodes', e.target.checked
              ? [...value.impactCodes, impact.code] : value.impactCodes.filter((c) => c !== impact.code))} />{impact.label}
          </label>)}</div>
      </fieldset>
    </section>
    <details className="border-t border-neutral-200 pt-2">
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-neutral-800">Responsables y gestión <span className="font-normal text-neutral-600">· Opcional</span></summary>
      <div className="grid gap-4 pb-4 sm:grid-cols-2 [&>div]:min-w-0">
        {management}
        {select('companyCode', 'Empresa', options.companies, original.company)}
        {select('processCode', 'Proceso N2', options.processes, original.process)}
        {select('subprocessCode', 'Subproceso', options.subprocesses.filter((s) => s.parentCode === value.processCode),
          original.process?.code === value.processCode ? original.subprocess : null)}
        <Select id="matrix-responsible" label="Responsable de atención" size="lg" clearable disabled={disabled}
          helperText="Responsable de seguimiento. La cuadrilla asignada determina quién puede ejecutar la atención."
          value={value.responsibleUserId?.toString() ?? null} placeholder="Sin asignar"
          options={[...options.responsiblePeople, ...(original.responsible && !options.responsiblePeople.some((p) => p.id === original.responsible?.id) ? [original.responsible] : [])]
            .map((p) => ({ id: p.id, code: String(p.id), label: p.fullName }))}
          onChange={(p) => change('responsibleUserId', p ? Number(p.code) : null)} />
      </div>
    </details>
    <details className="border-t border-neutral-200 pt-2">
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-neutral-800">Causa raíz y acciones <span className="font-normal text-neutral-600">· Opcional</span></summary>
      <div className="space-y-4 pb-4">
      <Textarea id="matrix-immediate" label="Acción inmediata / corrección" value={value.immediateAction ?? ''} disabled={disabled} maxLength={10000}
        onChange={(v) => change('immediateAction', v)} helperText="Describir no acredita ejecución. Registra y completa las acciones requeridas en Intervenciones vinculadas." />
      {select('rootCauseCode', 'Causa raíz catalogada', options.rootCauses, original.rootCauseItem)}
      {cause?.description && <p className="text-sm text-neutral-700">{cause.description}</p>}
      <Textarea id="matrix-cause" label="Causa raíz detallada" value={value.rootCause ?? ''} disabled={disabled} maxLength={10000}
        onChange={(v) => change('rootCause', v)} helperText="Se confirma mediante análisis; no se deduce automáticamente del reporte." />
      <Textarea id="matrix-preventive" label="Acción preventiva / oportunidad de mejora" value={value.preventiveAction ?? ''} disabled={disabled} maxLength={10000}
        onChange={(v) => change('preventiveAction', v)} helperText="Propuesta para evitar recurrencias o mejorar el servicio. El trabajo real se relaciona en Intervenciones." />
      <Input id="matrix-impacted" label="Proceso impactado para mejora" size="lg" value={value.impactedProcess ?? ''} disabled={disabled} maxLength={1000}
        onChange={(v) => change('impactedProcess', v)} />
      <Textarea id="matrix-observations" label="Observaciones" value={value.observations ?? ''} disabled={disabled} maxLength={10000}
        onChange={(v) => change('observations', v)} />
      </div>
    </details>
  </div>;
}

export function IncidentMatrixSummary({ matrix }: { matrix: IncidentMatrix }) {
  const fields: [string, string | null | undefined][] = [
    ['Tipo de evento',matrix.event?.label],['Tipo de servicio',matrix.serviceGroup?.label],['Canal de ingreso',matrix.intakeChannel?.label],
    ['Reportado por',matrix.reporterName],['Sección',matrix.zone?.label],['Sector',matrix.zone?.sectorLabel],
    ['Servicio', matrix.service?.label], ['Empresa', matrix.company?.label], ['Proceso N2', matrix.process?.label],
    ['Subproceso', matrix.subprocess?.label], ['Severidad', matrix.severity?.label],
    ['Impactos', matrix.impacts.map((i) => i.label).join(', ')], ['Responsable', matrix.responsible?.fullName],
    ['Acción inmediata / corrección', matrix.immediateAction], ['Causa raíz catalogada', matrix.rootCauseItem?.label],
    ['Causa raíz detallada', matrix.rootCause], ['Prevención / mejora', matrix.preventiveAction],
    ['Proceso impactado', matrix.impactedProcess], ['Observaciones', matrix.observations],
  ];
  return <dl className="grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2 lg:grid-cols-3">{fields.filter(([, value]) => Boolean(value)).map(([label, value]) => <div key={label} className="min-w-0">
    <dt className="font-medium text-neutral-700">{label}</dt><dd className="whitespace-pre-wrap break-words">{value || 'Sin determinar'}</dd>
  </div>)}</dl>;
}
