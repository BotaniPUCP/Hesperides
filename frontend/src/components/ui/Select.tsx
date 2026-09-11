'use client';

import { cn } from '@/lib/cn';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface SelectOption {
  id: number;
  code: string;
  label: string;
}

export interface SelectProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (option: SelectOption | null) => void;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  clearable?: boolean;
  searchable?: boolean;
}

/**
 * Se apoya en el <select> nativo a propósito: trae gratis el teclado, el
 * lector de pantalla y el selector propio de cada móvil, que una lista
 * personalizada tendría que reimplementar entera y peor.
 *
 * `value` compara por `code`, nunca por `id`: el id es un detalle de la base
 * y cambia entre entornos; el code es el contrato (SPEC-002 INV-04).
 */
export function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccione una opción',
  helperText,
  errorMessage,
  disabled = false,
  loading = false,
  required = false,
  clearable = false,
}: SelectProps) {
  const hasError = Boolean(errorMessage);
  const describedBy = hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        <LoadingSkeleton variant="text" className="h-10" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-action-danger">*</span>}
      </label>

      <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const code = event.target.value;
          onChange(code === '' ? null : (options.find((o) => o.code === code) ?? null));
        }}
        className={cn(
          'h-10 w-full rounded-md border bg-neutral-0 px-3 text-base text-neutral-900',
          'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
          hasError ? 'border-action-danger' : 'border-neutral-200 hover:border-neutral-500',
        )}
      >
        {/* La opción vacía siempre existe para poder mostrar el placeholder;
            solo es seleccionable si el campo admite limpiarse. */}
        <option value="" disabled={!clearable}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>

      {hasError ? (
        <p id={`${id}-error`} className="text-sm text-action-danger">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-sm text-neutral-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
