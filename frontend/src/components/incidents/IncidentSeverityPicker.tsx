'use client';

/** Códigos protegidos de `URGENCY_LEVEL`; la gravedad que marca quien reporta (SPEC-201 §3.2). */
export const SEVERITIES = [
  { code: 'LOW', label: 'Baja', hint: 'Puede esperar' },
  { code: 'MEDIUM', label: 'Media', hint: 'Atender pronto' },
  { code: 'HIGH', label: 'Alta', hint: 'Riesgo para personas o daño grave' },
] as const;

export function IncidentSeveritySelector({ value, onChange, disabled, error }: {
  value: string; onChange: (code: string) => void; disabled: boolean; error: string;
}) {
  return (
    <fieldset aria-invalid={error ? true : undefined} className="space-y-2">
      <legend className="text-sm font-medium text-neutral-900">¿Qué tan grave es?</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SEVERITIES.map((s) => (
          <label key={s.code} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-brand-600 ${value === s.code ? 'border-brand-600 bg-brand-50' : 'border-neutral-200 bg-neutral-0'}`}>
            <input type="radio" name="incident-severity" value={s.code} checked={value === s.code} disabled={disabled}
              onChange={() => onChange(s.code)} aria-label={s.label} />
            <span><span className="block font-semibold text-neutral-900">{s.label}</span>
              <span className="block text-neutral-700">{s.hint}</span></span>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
    </fieldset>
  );
}
