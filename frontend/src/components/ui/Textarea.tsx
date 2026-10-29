'use client';

import { cn } from '@/lib/cn';

export interface TextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  disabled?: boolean;
  required?: boolean;
}

export function Textarea({
  id, label, value, onChange, rows = 4, maxLength, placeholder,
  helperText, errorMessage, disabled = false, required = false,
}: TextareaProps) {
  const hasError = Boolean(errorMessage);
  const describedBy = hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}{required && <span className="ml-0.5 text-action-danger">*</span>}
      </label>
      <textarea
        id={id} value={value} onChange={(event) => onChange(event.target.value)}
        rows={rows} maxLength={maxLength} placeholder={placeholder} disabled={disabled}
        aria-required={required || undefined} aria-invalid={hasError || undefined} aria-describedby={describedBy}
        className={cn(
          'min-h-12 w-full rounded-md border bg-neutral-0 p-3 text-base text-neutral-900 placeholder:text-neutral-500',
          'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
          hasError ? 'border-action-danger' : 'border-neutral-200 hover:border-neutral-500',
        )}
      />
      {hasError ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-action-danger">{errorMessage}</p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-sm text-neutral-700">{helperText}</p>
      ) : null}
    </div>
  );
}
