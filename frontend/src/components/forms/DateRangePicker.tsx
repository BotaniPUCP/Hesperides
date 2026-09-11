'use client';

import { cn } from '@/lib/cn';

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface DateRangePreset {
  label: string;
  range: DateRange;
}

export interface DateRangePickerProps {
  label: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: DateRangePreset[];
  minDate?: string;
  maxDate?: string;
  errorMessage?: string;
  disabled?: boolean;
}

const RANGO_INVERTIDO = 'La fecha final no puede ser anterior a la inicial';

/**
 * Usa dos <input type="date"> nativos: cada navegador y cada móvil aporta su
 * propio calendario, ya accesible y localizado, que un calendario propio
 * tendría que reimplementar entero.
 */
export function DateRangePicker({
  label,
  value,
  onChange,
  presets,
  minDate,
  maxDate,
  errorMessage,
  disabled = false,
}: DateRangePickerProps) {
  // El rango invertido lo detecta el componente; un error externo tiene
  // prioridad porque viene de una regla de negocio que él no conoce.
  const rangoInvertido = value.from !== null && value.to !== null && value.to < value.from;
  const mensaje = errorMessage ?? (rangoInvertido ? RANGO_INVERTIDO : undefined);
  const hasError = Boolean(mensaje);

  const inputClass = cn(
    'h-10 w-full rounded-md border bg-neutral-0 px-3 text-base text-neutral-900',
    'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1',
    'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
    hasError ? 'border-action-danger' : 'border-neutral-200 hover:border-neutral-500',
  );

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="text-sm font-medium text-neutral-700">{label}</legend>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.range)}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="date-range-from" className="text-xs text-neutral-500">
            Desde
          </label>
          <input
            id="date-range-from"
            type="date"
            value={value.from ?? ''}
            min={minDate}
            max={maxDate}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? 'date-range-error' : undefined}
            onChange={(event) => onChange({ from: event.target.value || null, to: value.to })}
            className={inputClass}
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="date-range-to" className="text-xs text-neutral-500">
            Hasta
          </label>
          <input
            id="date-range-to"
            type="date"
            value={value.to ?? ''}
            min={value.from ?? minDate}
            max={maxDate}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? 'date-range-error' : undefined}
            onChange={(event) => onChange({ from: value.from, to: event.target.value || null })}
            className={inputClass}
          />
        </div>
      </div>

      {mensaje && (
        <p id="date-range-error" className="text-sm text-action-danger">
          {mensaje}
        </p>
      )}
    </fieldset>
  );
}
