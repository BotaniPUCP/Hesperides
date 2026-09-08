'use client';

import { useId } from 'react';

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
  const hintId = useId();
  const hasError = Boolean(errorMessage);
  const isDisabled = disabled || loading;
  const selected = options.find((option) => option.code === value);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const code = event.target.value;
    onChange(code === '' ? null : (options.find((option) => option.code === code) ?? null));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="h-10 animate-pulse rounded-md bg-slate-200" aria-busy="true" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <select
        id={id}
        value={selected ? selected.code : ''}
        onChange={handleChange}
        disabled={isDisabled}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? hintId : undefined}
        className={`h-10 w-full appearance-none rounded-md border bg-white px-3 py-2 text-base text-slate-900
        ${isDisabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : 'hover:border-slate-500'}
        ${hasError
          ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
          : 'border-slate-200 focus:border-green-600 focus:ring-green-600'}
        focus:outline-none focus:ring-2`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.code}>
            {option.label}
          </option>
        ))}
        {clearable && <option value="">—</option>}
      </select>
      {(helperText && !hasError) && <p className="text-xs text-slate-500">{helperText}</p>}
      {hasError && (
        <p id={hintId} className="text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}