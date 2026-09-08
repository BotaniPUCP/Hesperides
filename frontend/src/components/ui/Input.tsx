'use client';

import { useId } from 'react';

export interface InputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'search';
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
  leadingIcon?: React.ReactNode;
  onBlur?: () => void;
}

export function Input({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  helperText,
  errorMessage,
  disabled = false,
  required = false,
  maxLength,
  autoComplete,
  leadingIcon,
  onBlur,
}: InputProps) {
  const hintId = useId();
  const hasError = Boolean(errorMessage);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? hintId : undefined}
          className={`h-10 w-full rounded-md border px-3 text-base text-slate-900 placeholder:text-slate-400
            ${leadingIcon ? 'pl-10' : ''}
            ${disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}
            ${hasError
              ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
              : 'border-slate-200 hover:border-slate-500 focus:border-green-600 focus:ring-green-600'}
            focus:outline-none focus:ring-2`}
        />
      </div>
      {(helperText && !hasError) && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
      {hasError && (
        <p id={hintId} className="flex items-center gap-1 text-xs text-red-600" role="alert">
          <ExclamationIcon />
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function ExclamationIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}